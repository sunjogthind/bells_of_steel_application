/* ------------------------------------------------------------------ *
 * Spotter — language layer.
 *
 * Turns free text into a structured training profile and an intent. This is
 * the part that has to be reliable: everything downstream is generated from
 * the slots extracted here, so a wrong extraction produces a confidently
 * wrong program. Anything not confidently extracted stays null and gets
 * asked about rather than assumed.
 * ------------------------------------------------------------------ */
import type { Profile, Intent, Goal, Experience, SpotterIndex } from './spotter-types';

export const EMPTY_PROFILE: Profile = {
  goal: null, experience: null, days: null, sessionMins: null, equipment: [], constraints: [],
};

const WORD_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
};

const BODY_PARTS = ['shoulder', 'knee', 'back', 'elbow', 'wrist', 'hip', 'neck', 'ankle', 'lower back', 'rotator cuff'];
const PAIN_WORDS = /\b(hurt|hurts|hurting|pain|painful|injur|injured|injury|sore|tweak|tweaked|strain|sprain|surgery|torn|tear|impinge|tendon|physio|rehab)\b/i;

/** Days per week: "4 days", "four times a week", "train 3x". */
export function extractDays(text: string): number | null {
  const t = text.toLowerCase();
  let m = t.match(/(\d)\s*(?:x|times?|days?|sessions?)\s*(?:a|per|\/)?\s*(?:week|wk)?/);
  if (m) { const n = +m[1]; if (n >= 1 && n <= 7) return n; }
  m = t.match(/\b(one|two|three|four|five|six|seven)\s+(?:days?|times?|sessions?)\b/);
  if (m) return WORD_NUM[m[1]];
  return null;
}

export function extractSessionMins(text: string): number | null {
  const m = text.toLowerCase().match(/(\d{2,3})\s*(?:min|minute|minutes)\b/);
  if (m) { const n = +m[1]; if (n >= 15 && n <= 180) return n; }
  if (/\bhour\b/.test(text.toLowerCase())) return 60;
  return null;
}

export function extractGoal(text: string): Goal | null {
  const t = text.toLowerCase();
  if (/\b(stronger|strength|powerlifting|1rm|one rep max|heavier|max out)\b/.test(t)) return 'strength';
  if (/\b(muscle|size|bigger|mass|hypertrophy|aesthetic|jacked|tone|toned)\b/.test(t)) return 'hypertrophy';
  if (/\b(lose|fat|lean|cut|cutting|weight loss|slim)\b/.test(t)) return 'fatloss';
  if (/\b(fit|fitness|general|healthy|health|conditioning|stamina|endurance)\b/.test(t)) return 'general';
  return null;
}

export function extractExperience(text: string): Experience | null {
  const t = text.toLowerCase();
  if (/\b(never lifted|complete beginner|beginner|new to|just start|starting out|novice|first time)\b/.test(t)) return 'beginner';
  if (/\b(advanced|competed|competitive|ten years|10 years|many years|experienced lifter)\b/.test(t)) return 'advanced';
  if (/\b(intermediate|couple of years|few years|two years|three years|a year|1 year|18 months)\b/.test(t)) return 'intermediate';
  const m = t.match(/(\d+)\s*(?:years?|yrs?)\b/);
  if (m) { const y = +m[1]; return y < 1 ? 'beginner' : y < 4 ? 'intermediate' : 'advanced'; }
  const mo = t.match(/(\d+)\s*months?\b/);
  if (mo) return +mo[1] < 12 ? 'beginner' : 'intermediate';
  return null;
}

/** Equipment mentions, resolved against the index's own vocabulary. */
export function extractEquipment(text: string, ix: SpotterIndex): string[] {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ')} `;
  const found = new Set<string>();
  ix.equipment.forEach((e) => {
    const hit = [e.label.toLowerCase(), ...e.aliases].some((a) => t.includes(` ${a} `) || t.includes(` ${a}s `));
    if (hit) found.add(e.id);
  });
  // "nothing"/"no equipment" is a positive statement, not an absence of one.
  if (/\b(no equipment|nothing|bodyweight only|just my bodyweight)\b/.test(t)) found.add('bodyweight');
  // A rack almost always implies a pull-up bar; say so rather than silently assuming.
  return Array.from(found);
}

export function extractConstraints(text: string): string[] {
  if (!PAIN_WORDS.test(text)) return [];
  const t = text.toLowerCase();
  const parts = BODY_PARTS.filter((b) => t.includes(b));
  return parts.length ? parts : ['unspecified'];
}

/* Three ways someone talks about their equipment, and they mean different things:
     "I also have a bench"          -> add
     "I don't have a bench anymore" -> remove
     "all I have is a kettlebell"   -> replace the whole set
   Treating the third as an addition leaves stale equipment on the profile and
   silently hides every gap that should have been found. */
const EXCLUSIVE = /\b(only have|only got|only own|all i have|all i'?ve got|all i own|just have|just got|nothing but|the only)\b/i;
const NEGATED = /\b(don'?t have|do not have|no longer have|got rid of|without|haven'?t got|lost the|sold the)\b/i;

export type EquipmentEdit = 'add' | 'remove' | 'replace';
export function equipmentEdit(text: string): EquipmentEdit {
  if (EXCLUSIVE.test(text)) return 'replace';
  if (NEGATED.test(text)) return 'remove';
  return 'add';
}

/** Merge newly-extracted slots over an existing profile without clobbering with nulls. */
export function mergeProfile(base: Profile, text: string, ix: SpotterIndex): Profile {
  const eq = extractEquipment(text, ix);
  const edit = equipmentEdit(text);
  const equipment =
    eq.length === 0 ? base.equipment
    : edit === 'replace' ? eq
    : edit === 'remove' ? base.equipment.filter((e) => !eq.includes(e))
    : Array.from(new Set([...base.equipment, ...eq]));
  return {
    goal: extractGoal(text) ?? base.goal,
    experience: extractExperience(text) ?? base.experience,
    days: extractDays(text) ?? base.days,
    sessionMins: extractSessionMins(text) ?? base.sessionMins,
    equipment,
    constraints: Array.from(new Set([...base.constraints, ...extractConstraints(text)])),
  };
}

export function profileComplete(p: Profile) {
  return p.goal != null && p.experience != null && p.days != null && p.equipment.length > 0;
}

export function missingSlots(p: Profile): string[] {
  const out: string[] = [];
  if (!p.experience) out.push('how long you have been training');
  if (!p.goal) out.push('what you want out of it');
  if (!p.days) out.push('how many days a week you can train');
  if (!p.equipment.length) out.push('what equipment you have');
  return out;
}

/* ---------- intent ---------- */

/* Edit intents only make sense once a program exists. Without that guard,
   "4 days a week" in an opening message reads as "change it to 4 days"
   rather than as a profile fact. */
const EDIT_RULES: [Intent, RegExp][] = [
  ['swap', /\b(swap|replace|instead of|substitute|different|change the|something else|alternative|don'?t like)\b/i],
  ['equipment_change', /\b(don'?t have|do not have|no longer|got rid of|just got|bought|added|only have|only got|all i have|i have|i'?ve got)\b/i],
  ['adjust_days', /\b(make it|change (it )?to|switch to|more days|fewer days|less days)\b.*\b(\d|one|two|three|four|five|six)\s*(days?|times?|sessions?)\b|\b(\d|one|two|three|four|five|six)\s*(days?|times?|sessions?)\s*(instead|now)\b/i],
];

const GENERAL_RULES: [Intent, RegExp][] = [
  ['product', /\b(buy|purchase|worth it|recommend|which rack|what should i get|upgrade|shop|cost|price)\b/i],
  ['app', /\b(app|dashboard|calendar|widget|report|readiness|habit tracker|program library|community|form check)\b/i],
  ['explain', /\b(why|what is|what'?s|how do|how does|explain|should i|is it|tell me about|mean)\b/i],
  ['generate', /\b(program|workout|plan|routine|build me|make me|give me|generate|start)\b/i],
];

export function classify(text: string, hasProgram: boolean): Intent {
  if (PAIN_WORDS.test(text)) return 'injury';
  if (hasProgram) {
    for (const [intent, rx] of EDIT_RULES) if (rx.test(text)) return intent;
  }
  for (const [intent, rx] of GENERAL_RULES) if (rx.test(text)) return intent;
  // An opening message full of profile facts is a profile message, not a mystery.
  if (!hasProgram && (extractDays(text) || extractGoal(text) || extractExperience(text))) return 'profile';
  return hasProgram ? 'unknown' : 'profile';
}

/** Which exercise is the user talking about? Used by swap. */
export function findExerciseMention(text: string, ix: SpotterIndex): string | null {
  const t = text.toLowerCase();
  let best: { id: string; len: number } | null = null;
  ix.docs.filter((d) => d.kind === 'exercise').forEach((d) => {
    const names = [d.title.toLowerCase()];
    if (t.includes(names[0]) && (!best || names[0].length > best.len)) best = { id: d.id, len: names[0].length };
  });
  return best ? (best as { id: string }).id : null;
}
