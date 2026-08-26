/* ------------------------------------------------------------------ *
 * Spotter — retrieval and program synthesis.
 *
 * Hybrid retrieval: BM25 over the corpus, a concept-expansion pass standing in
 * for a dense embedding model, then a structured filter on equipment and
 * difficulty, then a rerank. The expansion layer is the seam where a real
 * embedding model drops in - same function boundary, same output shape.
 *
 * Generation is deterministic by default. `composeReply` is the second seam:
 * with an API key present it hands the same retrieved context to Claude for
 * prose. What the reply is *allowed to say* is decided before either path runs.
 * ------------------------------------------------------------------ */
import type {
  SpotterIndex, SpotterDoc, Profile, Retrieved, Slot, Session, Program, Reply, Intent,
} from './spotter-types';
import {
  EMPTY_PROFILE, mergeProfile, classify, missingSlots, profileComplete, findExerciseMention,
} from './spotter-nlp';

const STOP = new Set('a an the and or but if is are was were be been being to of in on at for with from by as it its this that these those i you we they my your our do does did can could should would will just how what when where which who why not no yes get got have has had more most some any all'.split(' '));
export const tok = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t));

/* ---------- 1. retrieval ---------- */

export function expandQuery(q: string, ix: SpotterIndex) {
  const base = tok(q);
  const added: string[] = [];
  Object.entries(ix.concepts).forEach(([, words]) => {
    if (base.some((t) => words.includes(t))) words.forEach((w) => { if (!base.includes(w)) added.push(w); });
  });
  return { base, added: Array.from(new Set(added)) };
}

export function retrieve(
  q: string, ix: SpotterIndex,
  opts: { kinds?: string[]; limit?: number; equipment?: string[]; maxDifficulty?: number } = {}
): Retrieved[] {
  const { base, added } = expandQuery(q, ix);
  const { k1, b, avgLen } = ix.bm25;

  const scored = ix.docs
    .filter((d) => (opts.kinds ? opts.kinds.includes(d.kind) : true))
    .map((d) => {
      const why: string[] = [];
      let score = 0;
      const hit: string[] = [];
      base.forEach((t) => {
        const f = d.tf[t];
        if (!f) return;
        const idf = ix.idf[t] ?? 1;
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (d.len / avgLen))));
        hit.push(t);
      });
      if (hit.length) why.push(`lexical: ${hit.slice(0, 4).join(', ')}`);

      // Expansion terms contribute at a discount - they are inferred, not stated.
      let exp = 0;
      const expHit: string[] = [];
      added.forEach((t) => {
        const f = d.tf[t];
        if (!f) return;
        const idf = ix.idf[t] ?? 1;
        exp += 0.35 * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (d.len / avgLen))));
        expHit.push(t);
      });
      if (expHit.length) why.push(`concept: ${expHit.slice(0, 4).join(', ')}`);
      score += exp;

      // Structured rerank
      if (d.kind === 'exercise' && opts.equipment) {
        if (canPerform(d, opts.equipment)) { score *= 1.25; why.push('equipment: available'); }
        else { score *= 0.35; why.push('equipment: not owned'); }
      }
      if (d.kind === 'exercise' && opts.maxDifficulty && d.meta.difficulty > opts.maxDifficulty) {
        score *= 0.6; why.push('difficulty: above level');
      }
      return { doc: d, score, why };
    })
    .filter((r) => r.score > 0)
    .sort((a, b2) => b2.score - a.score);

  return scored.slice(0, opts.limit ?? 6);
}

/* ---------- 2. equipment ---------- */

// Stated implications, surfaced in the trace rather than applied silently.
const IMPLIES: Record<string, string[]> = { rack: ['pullup_bar'], barbell: ['plates'] };

export function expandEquipment(owned: string[]) {
  const out = new Set(owned);
  const notes: string[] = [];
  owned.forEach((e) => (IMPLIES[e] ?? []).forEach((imp) => {
    if (!out.has(imp)) { out.add(imp); notes.push(`assumed ${imp.replace('_', ' ')} comes with your ${e}`); }
  }));
  out.add('bodyweight');
  return { equipment: Array.from(out), notes };
}

export function canPerform(doc: SpotterDoc, owned: string[]) {
  const req: string[] = doc.meta.equipment ?? [];
  return req.every((r) => r === 'bodyweight' || owned.includes(r));
}

/* ---------- 3. program synthesis ---------- */

const SPLITS: Record<string, { label: string; patterns: string[] }[]> = {
  fullbody: [{ label: 'Full body', patterns: ['squat', 'hinge', 'horizontal_push', 'horizontal_pull', 'core'] }],
  upperlower: [
    { label: 'Upper', patterns: ['horizontal_push', 'vertical_pull', 'vertical_push', 'horizontal_pull', 'arms'] },
    { label: 'Lower', patterns: ['squat', 'hinge', 'lunge', 'core', 'carry'] },
  ],
  ppl: [
    { label: 'Push', patterns: ['horizontal_push', 'vertical_push', 'horizontal_push', 'arms', 'core'] },
    { label: 'Pull', patterns: ['vertical_pull', 'horizontal_pull', 'horizontal_pull', 'arms', 'core'] },
    { label: 'Legs', patterns: ['squat', 'hinge', 'lunge', 'core', 'carry'] },
  ],
};

const SCHEME: Record<string, { main: [number, string, string]; acc: [number, string, string]; finisher: boolean }> = {
  strength:    { main: [4, '4–6', 'RPE 8'], acc: [3, '8–10', 'RPE 7–8'], finisher: false },
  hypertrophy: { main: [4, '8–10', 'RPE 8'], acc: [3, '10–12', 'RPE 8'], finisher: false },
  fatloss:     { main: [3, '10–12', 'RPE 7–8'], acc: [3, '12–15', 'RPE 8'], finisher: true },
  general:     { main: [3, '8–12', 'RPE 7–8'], acc: [3, '10–12', 'RPE 7'], finisher: true },
};

const DIFF_CAP: Record<string, number> = { beginner: 2, intermediate: 3, advanced: 3 };

function pickForPattern(ix: SpotterIndex, pattern: string, owned: string[], cap: number, used: Set<string>) {
  const candidates = ix.docs
    .filter((d) => d.kind === 'exercise' && d.meta.pattern === pattern && !used.has(d.id))
    .filter((d) => canPerform(d, owned))
    .filter((d) => d.meta.difficulty <= cap)
    .sort((a, b) => b.meta.difficulty - a.meta.difficulty);
  return candidates[0] ?? null;
}

function cheapestProductFor(ix: SpotterIndex, equipmentIds: string[]) {
  const matches = ix.docs
    .filter((d) => d.kind === 'product' && (d.meta.equipment ?? []).some((e: string) => equipmentIds.includes(e)))
    .sort((a, b) => a.meta.priceCents - b.meta.priceCents);
  const p = matches[0];
  return p ? { title: p.title, url: p.meta.url, priceCents: p.meta.priceCents } : undefined;
}

export function synthesize(profile: Profile, ix: SpotterIndex): Program {
  const days = profile.days ?? 3;
  const goal = profile.goal ?? 'general';
  const exp = profile.experience ?? 'beginner';
  const { equipment: owned } = expandEquipment(profile.equipment);
  const cap = DIFF_CAP[exp];
  const scheme = SCHEME[goal];

  const splitKey = days <= 3 ? 'fullbody' : days === 4 ? 'upperlower' : 'ppl';
  const template = SPLITS[splitKey];
  const rationale =
    splitKey === 'fullbody'
      ? `At ${days} day${days > 1 ? 's' : ''} a week, full-body sessions give every pattern ${days} exposures instead of one. It is also the structure that survives a missed session best.`
      : splitKey === 'upperlower'
      ? 'Four days splits cleanly into two upper and two lower sessions, so each half of the body gets trained twice with roughly 72 hours between exposures.'
      : `At ${days} days there is room to group by function, so each session can carry more volume for the muscles it targets without the whole body being fatigued at once.`;

  const warmupPool = ix.docs.filter((d) => d.kind === 'exercise' && d.meta.pattern === 'warmup' && canPerform(d, owned));
  const gaps: Program['gaps'] = [];
  const sessions: Session[] = [];

  for (let i = 0; i < days; i++) {
    const t = template[i % template.length];
    const used = new Set<string>();
    const slots: Slot[] = t.patterns.map((pattern, idx) => {
      const pick = pickForPattern(ix, pattern, owned, cap, used);
      if (!pick) {
        const needs = Array.from(new Set(
          ix.docs.filter((d) => d.kind === 'exercise' && d.meta.pattern === pattern)
            .flatMap((d) => d.meta.equipment as string[])
            .filter((e) => e !== 'bodyweight' && !owned.includes(e))
        ));
        if (!gaps.some((g) => g.pattern === pattern)) {
          gaps.push({ pattern, needs, product: cheapestProductFor(ix, needs) });
        }
        return { pattern, exerciseId: null, name: `No ${pattern.replace('_', ' ')} available`, sets: 0, reps: '—', rpe: '—',
          gap: { pattern, needs } };
      }
      used.add(pick.id);
      const [sets, reps, rpe] = idx < 2 ? scheme.main : scheme.acc;
      return {
        pattern, exerciseId: pick.id, name: pick.title, sets, reps, rpe,
        note: pick.meta.cues?.[0],
      };
    });

    if (scheme.finisher) {
      const cond = ix.docs.filter((d) => d.kind === 'exercise' && d.meta.pattern === 'conditioning' && canPerform(d, owned));
      const pick = cond[i % Math.max(cond.length, 1)];
      if (pick) slots.push({ pattern: 'conditioning', exerciseId: pick.id, name: pick.title, sets: 1, reps: '8–10 min', rpe: 'hard but repeatable', note: pick.meta.cues?.[0] });
    }

    sessions.push({
      day: i + 1,
      label: days <= 3 ? `${t.label} ${String.fromCharCode(65 + i)}` : t.label + (i >= template.length ? ' 2' : ''),
      warmup: warmupPool.slice(0, 4).map((d) => d.title),
      slots,
    });
  }

  const progression =
    exp === 'beginner'
      ? 'Add a small amount of weight each session while the reps stay clean. Miss the target reps twice in a row and drop about ten percent, then build back up.'
      : exp === 'intermediate'
      ? 'Hold the load for a week, add reps within the range, then add weight and reset to the bottom of the range. Deload every fifth or sixth week.'
      : 'Run this in three-to-four week blocks with a planned deload. Adjust by RPE rather than by a fixed percentage — the readiness data in the app is there for exactly this.';

  return { split: splitKey, rationale, sessions, gaps, progression };
}

/* ---------- 4. reply composition ---------- */

export type State = { profile: Profile; program: Program | null };
export const INITIAL_STATE: State = { profile: EMPTY_PROFILE, program: null };

const cite = (d: SpotterDoc, note: string) => ({
  title: d.title, kind: d.kind, note,
  url: d.kind === 'product' ? d.meta.url : undefined,
});

export function respond(text: string, state: State, ix: SpotterIndex): Reply {
  const trace: string[] = [];
  const profile = mergeProfile(state.profile, text, ix);
  const intent: Intent = classify(text, state.program != null);
  trace.push(`intent: ${intent}`);

  const extracted = Object.entries({
    goal: profile.goal, experience: profile.experience, days: profile.days,
    equipment: profile.equipment.length ? profile.equipment.join('+') : null,
    constraints: profile.constraints.length ? profile.constraints.join('+') : null,
  }).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`);
  trace.push(`profile slots: ${extracted.length ? extracted.join(' · ') : 'none yet'}`);

  const base = { intent, profile, escalate: false, composedBy: 'deterministic' as const };

  /* -- safety first, always --
     Escalate on the turn pain is raised. Afterwards the constraint stays on the
     profile and keeps blocking *program* work, but questions still get answered:
     refusing to talk at all because someone once mentioned a shoulder is not
     caution, it is just unhelpful. */
  const PROGRAM_INTENTS: Intent[] = ['generate', 'profile', 'swap', 'adjust_days', 'equipment_change', 'unknown'];
  if (intent === 'injury' || (profile.constraints.length > 0 && PROGRAM_INTENTS.includes(intent))) {
    const kb = retrieve('injury pain training around', ix, { kinds: ['knowledge'], limit: 2 });
    trace.push('safety rule matched → escalate, no program modification');
    return {
      ...base, escalate: true, program: state.program,
      text: intent !== 'injury' ? [
        `Still holding off on the program — you mentioned ${profile.constraints.join(' and ')} pain and that has not been cleared.`,
        `I can keep answering questions about training, equipment or the app in the meantime. I am just not going to write you a loading plan around an undiagnosed joint.`,
      ] : [
        `You mentioned ${profile.constraints.length && profile.constraints[0] !== 'unspecified' ? `your ${profile.constraints.join(' and ')}` : 'pain or an injury'}, so I am going to stop here rather than work around it.`,
        `Which substitutions are safe depends on what is actually wrong, and that needs someone who can examine you. I can generate a program once you have been cleared, and I can build it around movements you have been told to avoid — but I am not going to guess at that from a chat message.`,
        `Your Form Check channel is a reasonable place for technique questions. Pain is a different question and belongs with a physio or a doctor.`,
      ],
      citations: kb.map((r) => cite(r.doc, 'safety guidance')),
      trace,
    };
  }

  /* -- still gathering the profile -- */
  if (!profileComplete(profile) && ['profile', 'generate', 'unknown'].includes(intent)) {
    const missing = missingSlots(profile);
    trace.push(`profile incomplete → asking for: ${missing.join(', ')}`);
    return {
      ...base, program: state.program, citations: [],
      text: [
        extracted.length
          ? `Got it — ${extracted.map((e) => e.replace('=', ' ')).join(', ')}.`
          : `Happy to build you something.`,
        `Before I write anything I need ${missing.length === 1 ? '' : missing.length + ' more things'}: ${missing.join(', ')}.`,
        `Plain language is fine — "been lifting about a year, want to get stronger, 4 days, I've got a rack, barbell and bumpers" is everything I need in one line.`,
      ],
      trace,
    };
  }

  /* -- explain / knowledge -- */
  if (intent === 'explain' || intent === 'app') {
    const hits = retrieve(text, ix, { kinds: ['knowledge'], limit: 3 });
    trace.push(`retrieved ${hits.length} coaching notes, top score ${hits[0]?.score.toFixed(2) ?? '0'}`);
    if (!hits.length || hits[0].score < 1.2) {
      trace.push('below grounding threshold → refuse rather than improvise');
      return {
        ...base, program: state.program, escalate: true, citations: [],
        text: [
          `I do not have anything solid enough to answer that from.`,
          `Spotter only answers from its coaching notes and your catalogue. When neither covers a question it says so, rather than producing something that sounds authoritative and is not.`,
        ],
        trace,
      };
    }
    return {
      ...base, program: state.program, citations: hits.map((r) => cite(r.doc, r.why[0] ?? 'retrieved')),
      text: [hits[0].doc.meta.body, hits[1] ? `Related: ${hits[1].doc.title.toLowerCase()} — ${hits[1].doc.meta.body.split('. ')[0]}.` : ''].filter(Boolean),
      trace,
    };
  }

  /* -- product / equipment gap -- */
  if (intent === 'product') {
    const hits = retrieve(text, ix, { kinds: ['product'], limit: 4 });
    trace.push(`retrieved ${hits.length} catalogue products`);
    const gapLine = state.program?.gaps.length
      ? `Based on your current program, the gap worth closing first is ${state.program.gaps[0].pattern.replace('_', ' ')}.`
      : '';
    return {
      ...base, program: state.program,
      citations: hits.map((r) => cite(r.doc, `$${(r.doc.meta.priceCents / 100).toFixed(2)}`)),
      text: [
        gapLine,
        hits.length
          ? `From your live catalogue: ${hits.slice(0, 3).map((r) => `${r.doc.title} ($${(r.doc.meta.priceCents / 100).toFixed(2)})`).join(', ')}.`
          : `Nothing in your catalogue matched that closely enough to recommend.`,
        `Prices are from the snapshot this demo was built against — check the live store before buying.`,
      ].filter(Boolean),
      trace,
    };
  }

  /* -- swap an exercise -- */
  if (intent === 'swap' && state.program) {
    const mentioned = findExerciseMention(text, ix);
    const { equipment: owned } = expandEquipment(profile.equipment);
    const cap = DIFF_CAP[profile.experience ?? 'beginner'];
    if (!mentioned) {
      trace.push('no exercise resolved from the message → ask rather than guess');
      return { ...base, program: state.program, citations: [], trace,
        text: [`Which movement do you want changed? Name it and I will swap it for something in the same pattern that you have the equipment for.`] };
    }
    const target = ix.docs.find((d) => d.id === mentioned)!;
    const alt = ix.docs.filter((d) => d.kind === 'exercise' && d.meta.pattern === target.meta.pattern && d.id !== target.id)
      .filter((d) => canPerform(d, owned) && d.meta.difficulty <= cap)[0];
    trace.push(`swap target: ${target.title} (${target.meta.pattern})`);
    if (!alt) {
      return { ...base, program: state.program, citations: [cite(target, 'current')], trace,
        text: [`There is nothing else in the ${target.meta.pattern.replace('_', ' ')} pattern you have the equipment for. Keeping ${target.title} for now — tell me what you have and I will look again.`] };
    }
    const program = {
      ...state.program,
      sessions: state.program.sessions.map((s) => ({
        ...s,
        slots: s.slots.map((sl) => sl.exerciseId === target.id
          ? { ...sl, exerciseId: alt.id, name: alt.title, note: alt.meta.cues?.[0] }
          : sl),
      })),
    };
    trace.push(`swapped → ${alt.title}`);
    return {
      ...base, program,
      citations: [cite(target, 'replaced'), cite(alt, 'same pattern, equipment available')],
      text: [
        `Swapped ${target.title} for ${alt.title} — same ${target.meta.pattern.replace('_', ' ')} pattern, and you have what it needs.`,
        alt.meta.cues?.[0] ? `Cue: ${alt.meta.cues[0].toLowerCase()}.` : '',
      ].filter(Boolean),
      trace,
    };
  }

  /* -- generate / regenerate -- */
  const program = synthesize(profile, ix);
  const { notes } = expandEquipment(profile.equipment);
  notes.forEach((n) => trace.push(n));
  trace.push(`split: ${program.split} · ${program.sessions.length} sessions · ${program.gaps.length} equipment gap(s)`);

  const gapText = program.gaps.length
    ? `One gap: nothing in your kit covers ${program.gaps.map((g) => g.pattern.replace('_', ' ')).join(' or ')}. ${
        program.gaps[0].product
          ? `The cheapest fix in your catalogue is ${program.gaps[0].product.title} at $${(program.gaps[0].product.priceCents / 100).toFixed(2)}.`
          : ''}`
    : `Your kit covers every pattern in the split, so nothing is missing.`;

  return {
    ...base, program,
    citations: program.sessions[0].slots.filter((s) => s.exerciseId)
      .map((s) => cite(ix.docs.find((d) => d.id === s.exerciseId)!, s.pattern.replace('_', ' '))).slice(0, 5),
    text: [
      `Here is a ${profile.days}-day ${program.split === 'fullbody' ? 'full-body' : program.split === 'upperlower' ? 'upper/lower' : 'push/pull/legs'} program for ${profile.goal === 'fatloss' ? 'fat loss' : profile.goal}.`,
      program.rationale,
      gapText,
      program.progression,
    ],
    trace,
  };
}
