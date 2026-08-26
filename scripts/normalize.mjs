// Normalizes the raw Shopify snapshot into the shared data layer used by every demo,
// and computes catalog-health flags along the way.
import { readFileSync, writeFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync('data/catalog-raw.json', 'utf8'));
const strip = (h) => (h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const cents = (p) => Math.round(parseFloat(p) * 100);

const FAMILY = [
  [/\bhydra\b/i, 'Hydra'], [/\bmanticore\b/i, 'Manticore'], [/\bresidential\b/i, 'Residential'],
  [/\bkraken\b/i, 'Kraken'], [/\bblitz\b/i, 'Blitz'], [/\boblivyon\b/i, 'Oblivyon'],
];

// Spec patterns worth pulling out of the marketing copy.
function extractSpecs(text, title) {
  const s = {};
  const all = `${title} ${text}`;
  let m;
  if ((m = all.match(/(\d(?:\.\d+)?)\s*["”]?\s*x\s*(\d(?:\.\d+)?)\s*["”]/i))) s.tubing = `${m[1]}" x ${m[2]}"`;
  if ((m = all.match(/([⅛-⅞¼-¾]|\d\/\d)\s*["”]\s*holes?/i))) s.holeSize = m[1].replace('⅝', '5/8').replace('½', '1/2');
  const uprights = [...all.matchAll(/(\d{2,3})\s*["”]\s*upright/gi)].map((x) => +x[1]);
  if (uprights.length) s.uprightHeightIn = Math.max(...uprights);
  const cross = [...all.matchAll(/(\d{2,3})\s*["”]\s*(?:crossmember|pull.?up bar|safety strap)/gi)].map((x) => +x[1]);
  if (cross.length) s.crossmemberIn = Math.max(...cross);
  if ((m = all.match(/(\d{2,3})\s*["”]\s*(?:deep|depth)/i))) s.depthIn = +m[1];
  return s;
}

function derivedType(p, text) {
  const t = p.title.toLowerCase();
  const tags = (p.tags || []).map((x) => x.toLowerCase());
  const has = (...w) => w.some((x) => t.includes(x));
  if (tags.includes('spare parts') || has('spare part')) return 'Spare Parts';
  if (has('power rack', 'squat stand', 'squat rack', 'rig')) return 'Power Rack';
  if (has('barbell', ' bar -', 'ez curl')) return 'Barbell';
  if (has('plate')) return 'Weight Plate';
  if (has('dumbbell')) return 'Dumbbell';
  if (has('kettlebell')) return 'Kettlebell';
  if (has('bench')) return 'Bench';
  if (has('cable')) return 'Cable Machine';
  if (has('bike', 'treadmill', 'rower', 'ski', 'cardio')) return 'Cardio Machine';
  if (has('flooring', 'mat', 'tile')) return 'Flooring';
  if (has('attachment', 'j-cup', 'handle', 'landmine', 'dip', 'pull up')) return 'Attachment';
  if (has('shirt', 'hoodie', 'sleeve', 'belt', 'strap', 'wrap', 'apparel')) return 'Apparel & Support';
  return null;
}

const products = raw.products.map((p) => {
  const text = strip(p.body_html);
  const tags = p.tags || [];
  const prices = p.variants.map((v) => cents(v.price)).filter(Number.isFinite);
  const fam = FAMILY.find(([re]) => re.test(p.title));
  const vendorSuspect = /^related_to_\d+$/.test(p.vendor || '');
  const derived = derivedType(p, text);

  const flags = [];
  if (!p.product_type) flags.push(derived ? 'type_missing_inferable' : 'type_missing');
  if (p.product_type === 'Hidden') flags.push('type_placeholder');
  if (vendorSuspect) flags.push('vendor_corrupt');
  if (!p.images?.length) flags.push('no_images');
  if (text.length < 120) flags.push('thin_description');
  if (tags.includes('hide:specs')) flags.push('specs_hidden');
  if (tags.includes('Discontinued') && p.variants.some((v) => v.available)) flags.push('discontinued_but_buyable');
  if (p.variants.some((v) => !v.sku)) flags.push('missing_sku');
  if (p.variants.every((v) => !v.available)) flags.push('all_variants_oos');
  if (p.variants.some((v) => v.grams === 0 && v.requires_shipping)) flags.push('zero_shipping_weight');

  return {
    id: p.id, handle: p.handle, title: p.title,
    url: `https://bellsofsteel.com/products/${p.handle}`,
    type: p.product_type || null, derivedType: derived,
    family: fam ? fam[1] : null,
    vendor: p.vendor || null, vendorSuspect,
    tags, hgb: tags.filter((t) => t.startsWith('hgb_')),
    priceMinCents: prices.length ? Math.min(...prices) : null,
    priceMaxCents: prices.length ? Math.max(...prices) : null,
    available: p.variants.some((v) => v.available),
    variants: p.variants.map((v) => ({
      id: v.id, title: v.title, sku: v.sku || null,
      priceCents: cents(v.price), available: v.available, grams: v.grams,
    })),
    image: p.images?.[0]?.src || null,
    imageCount: p.images?.length || 0,
    specs: extractSpecs(text, p.title),
    text,
    flags,
  };
});

const out = { fetched_at: raw.fetched_at, source: raw.source, count: products.length, products };
writeFileSync('data/catalog.json', JSON.stringify(out));

// --- report ---
const flagCounts = {};
products.forEach((p) => p.flags.forEach((f) => (flagCounts[f] = (flagCounts[f] || 0) + 1)));
console.log(`normalized ${products.length} products -> data/catalog.json`);
console.log(`variants: ${products.reduce((s, p) => s + p.variants.length, 0)}`);
console.log(`\n--- catalogue health flags ---`);
Object.entries(flagCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
console.log(`\n--- spec extraction hit rates ---`);
['tubing', 'holeSize', 'uprightHeightIn', 'crossmemberIn'].forEach((k) => {
  console.log(`  ${String(products.filter((p) => p.specs[k] != null).length).padStart(4)}  ${k}`);
});
const racks = products.filter((p) => (p.type || p.derivedType) === 'Power Rack');
console.log(`\nracks: ${racks.length}, of those with upright height: ${racks.filter((p) => p.specs.uprightHeightIn).length}`);
console.log(`products carrying hgb_ tags: ${products.filter((p) => p.hgb.length).length}`);
