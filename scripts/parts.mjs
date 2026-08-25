// Flattens spare-part variants into a searchable index, and works out which
// machines have no spare parts published at all.
import { readFileSync, writeFileSync } from 'node:fs';

const { products: P } = JSON.parse(readFileSync('data/catalog.json', 'utf8'));

const isSpare = (p) => p.tags.includes('Spare Parts') || /spare part/i.test(p.title);
const spares = P.filter(isSpare);

/** Machine name, minus the "Spare Parts" boilerplate and any SKU noise in brackets. */
const machineOf = (title) =>
  title.replace(/\s*\(.*?\)\s*/g, ' ').replace(/spare parts?/i, '').replace(/\s+/g, ' ').trim();

const parts = [];
spares.forEach((p) => {
  const machine = machineOf(p.title);
  p.variants.forEach((v) => {
    const name = v.title === 'Default Title' ? machine : v.title;
    parts.push({
      id: `${p.id}-${v.id}`,
      name: name.replace(/\s*\(#\d+\)\s*$/, '').trim(),
      ref: (name.match(/\(#(\d+)\)/) || [])[1] ?? null, // diagram callout number, when present
      sku: v.sku,
      priceCents: v.priceCents,
      available: v.available,
      machine,
      parentTitle: p.title,
      url: p.url,
    });
  });
});

/** SP-<MACHINE>-<PART> is the convention. Surface it rather than making reps memorise it. */
const skuGrammar = (() => {
  const withSku = parts.filter((p) => p.sku);
  const prefixed = withSku.filter((p) => p.sku.startsWith('SP-'));
  const segments = {};
  prefixed.forEach((p) => {
    const seg = p.sku.split('-')[1];
    if (seg) segments[seg] = (segments[seg] ?? 0) + 1;
  });
  return {
    total: withSku.length,
    prefixed: prefixed.length,
    topMachineCodes: Object.entries(segments).sort((a, b) => b[1] - a[1]).slice(0, 12),
  };
})();

/** Serviceable machines with nothing published to repair them. */
const SERVICEABLE = /Cardio Machine|Cable Machine|Strength Machine|Bench|Leg Machine|Smith/i;
const machineNames = spares.map((p) => machineOf(p.title).toLowerCase());
const uncovered = P
  .filter((p) => {
    const t = p.type || p.derivedType || '';
    if (!SERVICEABLE.test(t) || isSpare(p)) return false;
    if (!p.available || (p.priceMinCents ?? 0) < 50000) return false;
    const title = p.title.toLowerCase();
    return !machineNames.some((m) => m.length > 4 && (title.includes(m) || m.includes(title.slice(0, 14))));
  })
  .sort((a, b) => (b.priceMinCents ?? 0) - (a.priceMinCents ?? 0))
  .map((p) => ({ title: p.title, type: p.type || p.derivedType, priceCents: p.priceMinCents, url: p.url }));

/** Plain-language symptoms a customer would actually type, mapped to part vocabulary. */
const SYMPTOMS = [
  { say: 'the pad is torn', match: ['pad', 'upholstery', 'cushion', 'seat'] },
  { say: 'a bolt is stripped', match: ['bolt', 'screw', 'hardware', 'nut'] },
  { say: 'the cable frayed', match: ['cable', 'wire', 'pulley'] },
  { say: 'the pin is bent', match: ['pin', 'selector', 'mag'] },
  { say: 'the pedal broke', match: ['pedal', 'crank'] },
  { say: 'the screen is dead', match: ['monitor', 'display', 'console'] },
  { say: 'it squeaks / wobbles', match: ['bushing', 'bearing', 'roller', 'stabilizer', 'foot'] },
  { say: 'the handle broke', match: ['handle', 'grip', 'knob'] },
];

writeFileSync('data/parts.json', JSON.stringify({
  generated_at: new Date().toISOString(),
  productCount: spares.length,
  partCount: parts.length,
  parts, skuGrammar, uncovered, symptoms: SYMPTOMS,
}, null, 2));

console.log(`parts -> data/parts.json`);
console.log(`  ${spares.length} spare-parts products flattened into ${parts.length} individual parts`);
console.log(`  ${skuGrammar.prefixed}/${skuGrammar.total} follow the SP- convention`);
console.log(`  ${uncovered.length} serviceable machines over $500 with no spare parts published`);
uncovered.slice(0, 8).forEach((u) => console.log(`     $${(u.priceCents / 100).toFixed(0).padStart(5)}  ${u.title}`));
