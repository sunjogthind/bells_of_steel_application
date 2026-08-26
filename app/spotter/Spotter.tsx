'use client';

import { useState, useRef, useEffect } from 'react';
import { respond, INITIAL_STATE, type State } from '@/lib/spotter';
import type { SpotterIndex, Reply, Program } from '@/lib/spotter-types';

const STARTERS = [
  { t: "I've been lifting about a year, want to get stronger. 4 days a week. I've got a Hydra rack, barbell, bumpers and a flat bench.", why: 'full profile in one line → program' },
  { t: 'Swap the barbell row for something else', why: 'conversational edit' },
  { t: 'Why does the rep range change between exercises?', why: 'retrieval from coaching notes' },
  { t: 'My left shoulder has been hurting on presses', why: 'safety → escalates, never works around it' },
  { t: 'I only have kettlebells and a pull-up bar, 3 days', why: 'equipment-constrained generation' },
  { t: 'What should I buy next?', why: 'gap → real catalogue product' },
];

type Turn = {
  role: 'user' | 'spotter';
  text: string[];
  reply?: Reply;
  composedBy?: 'deterministic' | 'claude';
  note?: string;
  usage?: { input: number | null; output: number | null } | null;
};

export default function Spotter({ ix }: { ix: SpotterIndex }) {
  const [state, setState] = useState<State>(INITIAL_STATE);
  const [turns, setTurns] = useState<Turn[]>([{
    role: 'spotter',
    text: [
      "I'm Spotter. Tell me how long you've been training, what you're after, how many days a week you can train, and what equipment you've got.",
      'One sentence is fine, I read plain language.',
    ],
  }]);
  const [input, setInput] = useState('');
  const [showTrace, setShowTrace] = useState(true);
  const [useClaude, setUseClaude] = useState(false);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [turns]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;

    // Retrieval, safety and synthesis happen first, always. The model never
    // gets to decide any of it.
    const reply = respond(text, state, ix);
    setState({ profile: reply.profile, program: reply.program });
    const idx = turns.length + 1;
    setTurns((t) => [...t, { role: 'user', text: [text] }, {
      role: 'spotter', text: reply.text, reply, composedBy: 'deterministic',
    }]);
    setInput('');

    if (!useClaude) return;

    setBusy(true);
    try {
      const res = await fetch('/api/spotter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          facts: reply.text,
          context: reply.citations.map((c) => ({ title: c.title, note: c.note })),
        }),
      });
      const data = await res.json();
      setTurns((t) => t.map((turn, i) => i !== idx ? turn : (
        data.available
          ? { ...turn, text: data.text, composedBy: 'claude' as const, usage: data.usage }
          : { ...turn, note: data.reason }
      )));
    } catch {
      setTurns((t) => t.map((turn, i) => i !== idx ? turn
        : { ...turn, note: 'Could not reach the composer, deterministic text kept.' }));
    } finally {
      setBusy(false);
    }
  };

  const last = [...turns].reverse().find((t) => t.reply)?.reply;
  const program = state.program;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* ---------------- conversation ---------------- */}
      <div>
        <div className="rounded-lg border border-line bg-ink shadow-soft">
          <div className="max-h-[520px] space-y-4 overflow-y-auto p-5">
            {turns.map((t, i) => (
              <div key={i} className={t.role === 'user' ? 'flex justify-end' : ''}>
                <div className={t.role === 'user'
                  ? 'max-w-[85%] rounded-lg bg-steel px-4 py-2.5 text-[15px] text-white'
                  : 'max-w-[92%]'}>
                  {t.role === 'spotter' && (
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded bg-bright text-[10px] font-bold text-ink">S</span>
                      <span className="text-[13px] font-bold">Spotter</span>
                      {t.reply?.escalate && (
                        <span className="rounded border border-red-500/40 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700">
                          handing to a human
                        </span>
                      )}
                      {t.reply && !t.reply.escalate && (
                        <span className="rounded border border-emerald-600/30 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          {t.reply.intent.replace('_', ' ')}
                        </span>
                      )}
                      {t.composedBy === 'claude' && (
                        <span className="rounded border border-steel/40 bg-steelSoft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-steelDim">
                          written by claude
                        </span>
                      )}
                    </div>
                  )}
                  {t.text.map((p, j) => (
                    <p key={j} className={`text-[15px] leading-relaxed ${t.role === 'user' ? '' : 'mb-2 text-dim last:mb-0'}`}>{p}</p>
                  ))}

                  {t.note && (
                    <p className="mt-2 rounded border border-line bg-panel px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-muted">
                      {t.note}
                    </p>
                  )}

                  {t.reply && t.reply.citations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {t.reply.citations.map((c, k) => (
                        c.url ? (
                          <a key={k} href={c.url} target="_blank" rel="noopener noreferrer"
                             className="rounded border border-line bg-panel px-2 py-1 text-[11px] text-muted transition-colors hover:border-steel hover:text-steelDim">
                            {c.title} <span className="text-lineStrong">· {c.note}</span>
                          </a>
                        ) : (
                          <span key={k} className="rounded border border-line bg-panel px-2 py-1 text-[11px] text-muted">
                            {c.title} <span className="text-lineStrong">· {c.note}</span>
                          </span>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 pt-3">
            <label className="flex cursor-pointer items-center gap-2 text-[13px]">
              <input type="checkbox" checked={useClaude} onChange={(e) => setUseClaude(e.target.checked)}
                     className="accent-steel" />
              <span className="font-semibold">Compose with Claude</span>
            </label>
            <span className="text-[12px] text-muted">
              {useClaude
                ? 'Retrieval and safety still run first, the model only rewrites the result, and gets discarded if it invents a number.'
                : 'Off: replies are composed deterministically, no API call.'}
            </span>
            {busy && <span className="ml-auto font-mono text-[11px] text-steelDim">composing…</span>}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="flex gap-2 p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)}
                   placeholder="Talk to Spotter…" aria-label="Message Spotter"
                   className="flex-1 rounded border border-line bg-panel px-3.5 py-2.5 text-[15px] outline-none transition-colors placeholder:text-muted focus:border-steel" />
            <button type="submit" className="rounded bg-steel px-5 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-steelDim">
              Send
            </button>
          </form>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {STARTERS.map((s) => (
            <button key={s.t} onClick={() => send(s.t)} title={s.why}
                    className="rounded border border-line bg-panel px-2.5 py-1.5 text-left text-[12px] text-muted transition-colors hover:border-steel hover:text-steelDim">
              {s.t.length > 54 ? s.t.slice(0, 52) + '…' : s.t}
            </button>
          ))}
        </div>

        {/* retrieval trace, the part worth showing */}
        {last && (
          <div className="mt-5 rounded-lg border border-line bg-panel">
            <button onClick={() => setShowTrace((v) => !v)}
                    className="flex w-full items-center justify-between p-4 text-left">
              <span className="stat-lbl">Retrieval trace · last turn</span>
              <span className="text-xs text-muted">{showTrace ? '−' : '+'}</span>
            </button>
            {showTrace && (
              <div className="border-t border-line p-4">
                <ol className="space-y-1.5">
                  {last.trace.map((t, i) => (
                    <li key={i} className="flex gap-2 font-mono text-[11px] leading-relaxed text-muted">
                      <span className="text-steelDim">{String(i + 1).padStart(2, '0')}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 border-t border-line pt-3 font-mono text-[11px] text-muted">
                  every step above is deterministic · generation is the only stage a model touches
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------------- profile + program ---------------- */}
      <div className="space-y-4">
        <div className="rounded-lg border border-line bg-panel p-4">
          <p className="stat-lbl">Profile extracted</p>
          <dl className="mt-3 space-y-2 text-[13px]">
            {([
              ['Experience', state.profile.experience],
              ['Goal', state.profile.goal],
              ['Days / week', state.profile.days],
              ['Session length', state.profile.sessionMins ? `${state.profile.sessionMins} min` : null],
            ] as [string, any][]).map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">{k}</dt>
                <dd className={v ? 'font-semibold' : 'text-lineStrong'}>{v ?? 'not yet known'}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-[13px] text-muted">Equipment</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {state.profile.equipment.length === 0
                ? <span className="text-[13px] text-lineStrong">not yet known</span>
                : state.profile.equipment.map((e) => (
                  <span key={e} className="rounded border border-steel/40 bg-steelSoft px-1.5 py-0.5 text-[11px] font-semibold text-steelDim">
                    {ix.equipment.find((q) => q.id === e)?.label ?? e}
                  </span>
                ))}
            </div>
          </div>
        </div>

        {program ? <ProgramCard program={program} /> : (
          <div className="grid h-40 place-items-center rounded-lg border border-dashed border-line text-[13px] text-muted">
            The program appears here once Spotter has enough to go on
          </div>
        )}
      </div>
    </div>
  );
}

function ProgramCard({ program }: { program: Program }) {
  const [day, setDay] = useState(0);
  const s = program.sessions[Math.min(day, program.sessions.length - 1)];
  return (
    <div className="rounded-lg border border-line bg-ink shadow-soft">
      <div className="border-b border-line p-4">
        <p className="stat-lbl">Your program</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {program.sessions.map((x, i) => (
            <button key={i} onClick={() => setDay(i)}
                    className={`rounded border px-2 py-1 text-[11px] font-semibold transition-colors ${
                      i === Math.min(day, program.sessions.length - 1)
                        ? 'border-steel bg-steelSoft text-steelDim' : 'border-line text-muted hover:border-muted'}`}>
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <p className="stat-lbl">Warm-up</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.warmup.join(' · ')}</p>

        <table className="mt-4 w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="stat-lbl">
              <th className="pb-2 font-semibold">Movement</th>
              <th className="pb-2 text-right font-semibold">Sets × reps</th>
            </tr>
          </thead>
          <tbody>
            {s.slots.map((sl, i) => (
              <tr key={i} className="border-t border-line align-top">
                <td className="py-2 pr-3">
                  {sl.gap ? (
                    <>
                      <span className="font-semibold text-amber-800">Gap: {sl.pattern.replace('_', ' ')}</span>
                      <p className="mt-0.5 text-[11px] text-amber-700">needs {sl.gap.needs.slice(0, 2).join(' or ').replace(/_/g, ' ')}</p>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">{sl.name}</span>
                      {sl.note && <p className="mt-0.5 text-[11px] leading-snug text-muted">{sl.note}</p>}
                    </>
                  )}
                </td>
                <td className="whitespace-nowrap py-2 text-right font-mono tabular-nums text-muted">
                  {sl.sets ? `${sl.sets} × ${sl.reps}` : ', '}
                  {sl.sets ? <div className="text-[11px] text-lineStrong">{sl.rpe}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {program.gaps.length > 0 && program.gaps[0].product && (
          <div className="mt-4 rounded border border-amber-500/35 bg-amber-50 p-3">
            <p className="text-[12px] font-bold text-amber-900">Closing the gap</p>
            <a href={program.gaps[0].product.url} target="_blank" rel="noopener noreferrer"
               className="mt-1 block text-[13px] text-amber-900 underline decoration-amber-600/30 underline-offset-2 hover:decoration-amber-700">
              {program.gaps[0].product.title}, ${(program.gaps[0].product.priceCents / 100).toFixed(2)}
            </a>
            <p className="mt-1 text-[11px] text-amber-700">From the live catalogue, cheapest option that covers it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
