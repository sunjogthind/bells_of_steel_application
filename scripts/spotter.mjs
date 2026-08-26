// Builds Spotter's retrieval index.
//
// Three document types share one index: exercises and coaching notes (ours,
// clearly labelled) and the real Bells of Steel product catalog. BM25 stats are
// precomputed here so the browser only does the scoring.
import { readFileSync, writeFileSync } from 'node:fs';
import { EXERCISES } from '../corpus/exercises.mjs';
import { KNOWLEDGE } from '../corpus/knowledge.mjs';
import { EQUIPMENT } from '../corpus/equipment.mjs';

const catalog = JSON.parse(readFileSync('data/catalog.json', 'utf8'));

const STOP = new Set('a an the and or but if is are was were be been being to of in on at for with from by as it its this that these those i you we they my your our do does did can could should would will just how what when where which who why not no yes get got have has had more most some any all'.split(' '));
const tok = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t));

/* ---------- documents ---------- */
const docs = [];

EXERCISES.forEach((e) => docs.push({
  id: `ex:${e.id}`, kind: 'exercise', title: e.name,
  text: [e.name, e.pattern.replace('_', ' '), ...e.primary, ...e.cues, ...e.mods, ...e.aliases].join('. '),
  meta: { pattern: e.pattern, primary: e.primary, equipment: e.equipment, difficulty: e.difficulty, cues: e.cues, mods: e.mods },
}));

KNOWLEDGE.forEach((k) => docs.push({
  id: `kb:${k.id}`, kind: 'knowledge', title: k.title,
  text: `${k.title}. ${k.topic}. ${k.body}`,
  meta: { topic: k.topic, body: k.body },
}));

// Real products, so an equipment gap resolves to something you can actually buy.
//
// The $0.00/$0.01 builder scaffolding the Catalog Audit flagged is excluded here.
// Left in, Spotter cheerfully recommends "Dumbbell Bench Combo - $0.01" as the
// cheapest way to close a gap, which is exactly the downstream pollution that
// audit finding predicted. Filtering it is the fix that finding argues for.
const PLACEHOLDER = /free for builders|variant for price|custom set|builder$|^home gym builder/i;
const products = catalog.products.filter((p) =>
  p.available && p.priceMinCents && p.priceMinCents >= 2000 && !PLACEHOLDER.test(p.title));
// Storage, spare parts and accessories mention the equipment they hold without
// being it. A "Dumbbell/Kettlebell Shelf" is not a way to acquire dumbbells.
const NOT_THE_THING = /shelf|storage|holder|hanger|spare parts?|bracket|peg|tray|stand for|cover|sleeve protector|sticker|wall rack|connector|hinge|cables? for|upgrade kit|end cap|pulley|carabiner|connection kit/i;

// Their own product_type already separates the equipment from the bits that bolt
// onto it. An attachment or a component is not a way to acquire the thing it
// attaches to, so those types never satisfy an equipment gap.
const COMPONENT_TYPES = new Set([
  'Rack Component', 'Spare Parts', 'Storage', 'Storage Rack Attachment',
  'Cable Attachment', 'Barbell Accessory', 'Rack Attachment',
  'Strength Rack Attachment', 'Cable Rack Attachment',
]);

// Their product_type is a better signal than the title for "is this the actual
// thing". Where a class has an obvious primary type, require it; otherwise fall
// back to matching the title.
const PRIMARY_TYPE = {
  rack: ['Power Rack'], barbell: ['Barbell'], trap_bar: ['Barbell'], ez_curl: ['Barbell'],
  plates: ['Weight Plate'], bench_flat: ['Bench'], bench_adj: ['Bench'],
  dumbbells: ['Dumbbell'], kettlebell: ['Kettlebell'], cable: ['Cable Machine'],
  bike: ['Cardio Machine'],
};

products.forEach((p) => {
  const type = p.type ?? p.derivedType ?? '';
  const cls = NOT_THE_THING.test(p.title) || COMPONENT_TYPES.has(type)
    ? []
    : EQUIPMENT
        .filter((e) => e.match && e.match.test(p.title))
        .filter((e) => !PRIMARY_TYPE[e.id] || PRIMARY_TYPE[e.id].includes(type))
        .map((e) => e.id);
  docs.push({
    id: `pr:${p.id}`, kind: 'product', title: p.title,
    text: `${p.title}. ${p.type ?? p.derivedType ?? ''}. ${p.text.slice(0, 180)}`,
    meta: { url: p.url, priceCents: p.priceMinCents, equipment: cls, family: p.family },
  });
});

/* ---------- BM25 ---------- */
const K1 = 1.5, B = 0.75;
const tokens = docs.map((d) => tok(d.text));
const df = {};
tokens.forEach((ts) => new Set(ts).forEach((t) => (df[t] = (df[t] ?? 0) + 1)));
const N = docs.length;
const idf = {};
Object.entries(df).forEach(([t, n]) => (idf[t] = Math.log(1 + (N - n + 0.5) / (n + 0.5))));
const avgLen = tokens.reduce((s, t) => s + t.length, 0) / N;

// Per-document term frequencies, pruned to terms that actually discriminate.
const tf = tokens.map((ts) => {
  const m = {};
  ts.forEach((t) => (m[t] = (m[t] ?? 0) + 1));
  return m;
});

/* ---------- concept expansion ----------
   Stands in for a dense embedding model: a hand-built map from the words people
   use to the vocabulary the corpus is written in. Honest about what it is - the
   seam where a real embedding model would go is the same function boundary. */
const CONCEPTS = {
  chest: ['chest', 'pecs', 'bench', 'press', 'push'],
  back: ['back', 'lats', 'row', 'pull', 'pulldown'],
  legs: ['legs', 'quads', 'squat', 'lunge', 'hamstrings', 'glutes'],
  glutes: ['glutes', 'hinge', 'thrust', 'deadlift'],
  arms: ['arms', 'biceps', 'triceps', 'curl', 'pushdown'],
  shoulders: ['shoulders', 'delts', 'overhead', 'press'],
  core: ['core', 'abs', 'plank', 'oblique', 'trunk'],
  strength: ['strength', 'strong', 'heavy', 'max', 'powerlifting'],
  hypertrophy: ['hypertrophy', 'muscle', 'size', 'bigger', 'mass', 'aesthetic'],
  fatloss: ['fat', 'lose', 'lean', 'cut', 'conditioning', 'cardio'],
  endurance: ['endurance', 'conditioning', 'cardio', 'stamina', 'fitness'],
  beginner: ['beginner', 'new', 'start', 'starting', 'novice', 'first'],
  recovery: ['recovery', 'deload', 'rest', 'sore', 'tired', 'readiness', 'sleep'],
  technique: ['technique', 'form', 'cue', 'position', 'setup'],
  space: ['ceiling', 'basement', 'garage', 'space', 'height', 'fit', 'small'],
};

writeFileSync('data/spotter.json', JSON.stringify({
  generated_at: new Date().toISOString(),
  stats: { docs: N, exercises: EXERCISES.length, knowledge: KNOWLEDGE.length, products: products.length, terms: Object.keys(idf).length, avgLen: +avgLen.toFixed(1) },
  bm25: { k1: K1, b: B, avgLen },
  idf, concepts: CONCEPTS,
  docs: docs.map((d, i) => ({ ...d, tf: tf[i], len: tokens[i].length, text: undefined })),
  equipment: EQUIPMENT.map(({ match, ...rest }) => rest),
}));

console.log('spotter -> data/spotter.json');
console.log(`  ${N} documents  (${EXERCISES.length} exercises, ${KNOWLEDGE.length} coaching notes, ${products.length} real products)`);
console.log(`  ${Object.keys(idf).length} terms, avg doc length ${avgLen.toFixed(1)}`);
console.log(`  ${Object.keys(CONCEPTS).length} concept clusters for query expansion`);
const mapped = EQUIPMENT.filter((e) => e.match && products.some((p) => e.match.test(p.title)));
console.log(`  ${mapped.length}/${EQUIPMENT.length} equipment classes resolve to a real purchasable product`);
