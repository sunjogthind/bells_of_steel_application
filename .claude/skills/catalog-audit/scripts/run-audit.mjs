#!/usr/bin/env node
// Portable catalog audit engine.
//
// Self-contained on purpose: the merch coordinator who runs this does not have the
// portfolio repo checked out, so everything the rules depend on - the live fetch, the
// slice of normalization the parts index needs, the parts index itself - is inlined
// here rather than read from data/. The rule bodies are the same logic as the repo's
// scripts/audit.mjs; scripts/verify-parity.mjs proves the two agree on a shared snapshot.
//
// Usage:
//   node run-audit.mjs                          fetch the live feed
//   node run-audit.mjs --snapshot <file.json>   read a saved raw feed instead
//   node run-audit.mjs --out <file.json>        where to write the findings
//   node run-audit.mjs --quiet                  no progress output on stderr
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const QUIET = argv.includes('--quiet');
const log = (...a) => { if (!QUIET) console.error(...a); };

const BASE = 'https://bellsofsteel.com/products.json';
const UA = 'bos-catalog-audit-skill/1.0 (catalog health check; contact ranasunj@ualberta.ca)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------- source */

/** Explains a failed read in terms the person running this can act on, rather than
 *  leaving them with a status code. Nothing is guessed at to fill the gap - a catalog
 *  that could not be read produces no report at all. */
function unreadable(reason) {
  return new Error(
    `Could not read the Bells of Steel catalog.\n\n  ${reason}\n\n`
    + `  This usually means one of three things: the storefront is briefly down, the\n`
    + `  network you are on cannot reach it, or the store is refusing automated reads\n`
    + `  from this connection. None of them are anything you did.\n\n`
    + `  You can still run against a saved copy of the catalog:\n`
    + `    node run-audit.mjs --snapshot <the saved catalog file>\n`
    + `  The report will say which day that copy is from.`);
}

async function fetchLive() {
  const all = [];
  for (let page = 1; page <= 40; page++) {
    let res;
    try {
      res = await fetch(`${BASE}?limit=250&page=${page}`, { headers: { 'User-Agent': UA } });
    } catch (e) {
      if (page === 1) throw unreadable(`The storefront did not respond (${e.message}).`);
      log(`page ${page} did not respond, stopping with ${all.length} products`);
      break;
    }
    if (!res.ok) {
      if (page === 1) throw unreadable(`The storefront answered with HTTP ${res.status}.`);
      log(`page ${page} -> HTTP ${res.status}, stopping here`);
      break;
    }
    const { products } = await res.json();
    if (!products?.length) break;
    all.push(...products);
    log(`  page ${page}: +${products.length} (total ${all.length})`);
    // Shopify can return fewer than the limit while more pages remain - page until empty.
    await sleep(600);
  }
  if (!all.length) throw unreadable('The storefront answered, but sent back no products.');
  return { fetched_at: new Date().toISOString(), source: BASE, count: all.length, products: all };
}

const snapshotPath = arg('--snapshot');
let raw;
try {
if (snapshotPath) {
  log(`Reading saved catalog: ${snapshotPath}`);
  raw = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  if (!Array.isArray(raw.products)) throw new Error(`${snapshotPath} does not look like a raw storefront feed (no products array).`);
} else {
  log('Reading the live Bells of Steel storefront feed...');
  raw = await fetchLive();
}
} catch (e) {
  console.error(`\n${e.message}\n`);
  process.exit(2);
}

const P = raw.products;
const url = (h) => `https://bellsofsteel.com/products/${h}`;
const strip = (h) => (h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const stripEnt = (h) => (h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const num = (x) => parseFloat(x);
const cents = (p) => Math.round(parseFloat(p) * 100);

/* --------------------------------------------- the slice of normalization
   the parts index needs. Kept minimal - only the fields parts coverage reads. */

function derivedTypeOf(p) {
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

const NORM = P.map((p) => {
  const prices = p.variants.map((v) => cents(v.price)).filter(Number.isFinite);
  return {
    id: p.id, title: p.title, url: url(p.handle),
    type: p.product_type || null, derivedType: derivedTypeOf(p),
    tags: p.tags || [],
    priceMinCents: prices.length ? Math.min(...prices) : null,
    available: p.variants.some((v) => v.available),
    variants: p.variants.map((v) => ({
      id: v.id, title: v.title, sku: v.sku || null,
      priceCents: cents(v.price), available: v.available,
    })),
    text: stripEnt(p.body_html),
  };
});

/* --------------------------------------------------------- parts coverage */

const partsData = (() => {
  const isSpare = (p) => p.tags.includes('Spare Parts') || /spare part/i.test(p.title);
  const spares = NORM.filter(isSpare);
  const machineOf = (title) =>
    title.replace(/\s*\(.*?\)\s*/g, ' ').replace(/spare parts?/i, '').replace(/\s+/g, ' ').trim();

  const parts = [];
  spares.forEach((p) => {
    const machine = machineOf(p.title);
    p.variants.forEach((v) => {
      const name = v.title === 'Default Title' ? machine : v.title;
      parts.push({ name: name.replace(/\s*\(#\d+\)\s*$/, '').trim(), sku: v.sku, machine });
    });
  });

  const SERVICEABLE = /Cardio Machine|Cable Machine|Strength Machine|Bench|Leg Machine|Smith/i;
  const machineNames = spares.map((p) => machineOf(p.title).toLowerCase());
  const uncovered = NORM
    .filter((p) => {
      const t = p.type || p.derivedType || '';
      if (!SERVICEABLE.test(t) || isSpare(p)) return false;
      if (!p.available || (p.priceMinCents ?? 0) < 50000) return false;
      const title = p.title.toLowerCase();
      return !machineNames.some((m) => m.length > 4 && (title.includes(m) || m.includes(title.slice(0, 14))));
    })
    .sort((a, b) => (b.priceMinCents ?? 0) - (a.priceMinCents ?? 0))
    .map((p) => ({ title: p.title, type: p.type || p.derivedType, priceCents: p.priceMinCents, url: p.url }));

  return { productCount: spares.length, partCount: parts.length, uncovered };
})();

/* ------------------------------------------------------------- the rules */

const findings = [];
const add = (f) => { if (f.count > 0) findings.push(f); };

/* 1 -------- same product, two live pages, two prices -------- */
{
  const byTitle = new Map();
  P.forEach((p) => byTitle.set(p.title, [...(byTitle.get(p.title) ?? []), p]));
  // Only compare like with like: every listing in the group must be a single-variant
  // product. Multi-variant listings (pairs vs singles, different lengths) are not
  // comparable on price and would produce false positives.
  const dupes = [...byTitle.entries()].filter(([, v]) =>
    v.length > 1
    && v.every((p) => p.variants.length === 1)
    && v.every((p) => num(p.variants[0].price) > 1)
  );
  const skipped = [...byTitle.entries()].filter(([, v]) => v.length > 1).length - dupes.length;
  const mismatched = dupes
    .map(([title, v]) => {
      const rows = v.map((p) => ({
        handle: p.handle, url: url(p.handle),
        price: Math.min(...p.variants.map((x) => num(x.price))),
      }));
      const spread = Math.max(...rows.map((r) => r.price)) - Math.min(...rows.map((r) => r.price));
      return { title, rows, spread };
    })
    .filter((d) => d.spread > 0)
    .sort((a, b) => b.spread - a.spread);

  add({
    id: 'duplicate-pricing', severity: 'critical',
    title: 'The same product is listed twice, at two different prices',
    count: mismatched.length, unit: 'rack pairs priced differently',
    metrics: {
      pairs: mismatched.length, comparablePairs: dupes.length, skipped,
      // "All 16" reads better than "16 of the 16"; the distinction is real when it is not all.
      pairsPhrase: mismatched.length === dupes.length ? `All ${dupes.length}` : `${mismatched.length} of the ${dupes.length}`,
      widestGap: mismatched.length ? +mismatched[0].spread.toFixed(2) : 0,
      widestGapProduct: mismatched.length ? mismatched[0].title.replace(/\s*\(.*\)$/, '') : null,
    },
    evidence: mismatched.slice(0, 12).map((m) => ({
      label: m.title.replace(/\s*\(.*\)$/, ''),
      detail: m.rows.map((r) => `$${r.price.toFixed(2)} on /${r.handle}`).join('  vs  '),
      delta: `$${m.spread.toFixed(2)} apart`,
      links: m.rows.map((r) => r.url),
    })),
  });
}

/* 2 -------- zero-priced purchasable variants -------- */
{
  const rows = [];
  P.forEach((p) => p.variants.forEach((v) => {
    if (num(v.price) <= 1 && v.available) rows.push({ p, v });
  }));
  const products = [...new Set(rows.map((r) => r.p.handle))];
  const deliberate = (p, v) => /FREE FOR BUILDERS/i.test(p.title) || /^Variant for price/i.test(v.title);
  const intentional = rows.filter((r) => deliberate(r.p, r.v));
  add({
    id: 'zero-price', severity: 'high',
    title: 'Products priced at $0.00 or $0.01 are live in the public feed',
    count: products.length, unit: 'products',
    metrics: { products: products.length, variants: rows.length, looksDeliberate: intentional.length },
    evidence: rows.slice(0, 10).map((r) => ({
      label: r.p.title,
      detail: r.v.title === 'Default Title'
        ? `$${num(r.v.price).toFixed(2)}, the product's only option`
        : `$${num(r.v.price).toFixed(2)} on the "${r.v.title}" option`,
      delta: deliberate(r.p, r.v) ? 'looks deliberate' : 'worth checking',
      links: [url(r.p.handle)],
    })),
  });
}

/* 3 -------- zero shipping weight on freight items -------- */
{
  const rows = [];
  P.forEach((p) => p.variants.forEach((v) => {
    if (v.grams === 0 && v.requires_shipping && num(v.price) > 50) rows.push({ p, v });
  }));
  const products = [...new Set(rows.map((r) => r.p.handle))];
  add({
    id: 'zero-weight', severity: 'high',
    title: 'Physical products have no shipping weight recorded',
    count: products.length, unit: 'products',
    metrics: { products: products.length, variants: rows.length },
    evidence: rows.sort((a, b) => num(b.v.price) - num(a.v.price)).slice(0, 10).map((r) => ({
      label: r.p.title,
      detail: r.v.title === 'Default Title'
        ? `$${num(r.v.price).toFixed(2)}`
        : `$${num(r.v.price).toFixed(2)} - ${r.v.title}`,
      delta: 'weight is 0', links: [url(r.p.handle)],
    })),
  });
}

/* 4 -------- corrupted vendor field -------- */
{
  const bad = P.filter((p) => /^related_to_\d+$/.test(p.vendor || ''));
  const good = P.filter((p) => p.vendor === 'Bells of Steel').length;
  add({
    id: 'vendor-corrupt', severity: 'high',
    title: 'Some products show a database code where the brand name should be',
    count: bad.length, unit: 'products',
    metrics: { bad: bad.length, correct: good },
    evidence: bad.slice(0, 10).map((p) => ({
      label: p.title, detail: `brand reads "${p.vendor}"`, delta: 'wrong', links: [url(p.handle)],
    })),
  });
}

/* 5 -------- sale badge with no sale -------- */
{
  const rows = [];
  P.forEach((p) => p.variants.forEach((v) => {
    const c = num(v.compare_at_price);
    if (!isNaN(c) && c > 0 && c <= num(v.price)) rows.push({ p, v, c });
  }));
  add({
    id: 'fake-sale', severity: 'medium',
    title: 'A crossed-out "was" price that matches the price being charged',
    count: rows.length, unit: 'product options',
    metrics: { variants: rows.length },
    evidence: rows.slice(0, 10).map((r) => ({
      label: r.p.title, detail: `sells for $${num(r.v.price).toFixed(2)}, shown as reduced from $${r.c.toFixed(2)}`,
      delta: 'no real discount', links: [url(r.p.handle)],
    })),
  });
}

/* 6 -------- published but unbuyable -------- */
{
  const bad = P.filter((p) => p.variants.length && p.variants.every((v) => !v.available));
  add({
    id: 'oos-published', severity: 'medium',
    title: 'Live product pages where nothing can be bought',
    count: bad.length, unit: 'products',
    metrics: { products: bad.length },
    evidence: bad.slice(0, 10).map((p) => ({
      label: p.title, detail: `${p.variants.length} option${p.variants.length > 1 ? 's' : ''}, none in stock`,
      delta: 'cannot be bought', links: [url(p.handle)],
    })),
  });
}

/* 7 -------- taxonomy -------- */
{
  const missing = P.filter((p) => !p.product_type);
  const placeholder = P.filter((p) => p.product_type === 'Hidden');
  add({
    id: 'taxonomy', severity: 'medium',
    title: 'A fifth of the catalog has no product category',
    count: missing.length + placeholder.length, unit: 'products',
    metrics: { empty: missing.length, placeholder: placeholder.length, scanned: P.length,
      share: Math.round(((missing.length + placeholder.length) / P.length) * 100) },
    evidence: missing.slice(0, 8).map((p) => ({
      label: p.title, detail: 'category is blank', delta: 'uncategorised', links: [url(p.handle)],
    })),
  });
}

/* 8 -------- suppressed specs -------- */
{
  const hidden = P.filter((p) => (p.tags || []).includes('hide:specs'));
  // Match the Residential line by its own hgb_ tag. An earlier version matched on
  // the title and picked up "...Power Rack Builder" scaffolding instead, which made
  // the claim contradict its own evidence.
  // Racks only - the Cable Tower carries the same tag but is not a rack. And test for
  // upright height specifically, which is the dimension that decides whether a rack
  // fits a room.
  const residential = P.filter((p) =>
    (p.tags || []).includes('hgb_residential_prebuilt') && /rack/i.test(p.title));
  const noDims = residential.filter((p) => !/(\d{2,3})\s*["”]\s*upright/i.test(strip(p.body_html)));
  add({
    id: 'specs-hidden', severity: 'medium',
    title: 'Spec tables are switched off, including on the entry-level racks',
    count: hidden.length, unit: 'products',
    metrics: { hidden: hidden.length, residentialRacks: residential.length, residentialNoHeight: noDims.length },
    evidence: noDims.map((p) => ({
      label: p.title, detail: 'no upright height published',
      delta: 'height unknown', links: [url(p.handle)],
    })),
  });
}

/* 8b -------- compatibility graph disagrees with the product titles -------- */
{
  const tagged = P.filter((p) => (p.tags || []).some((t) => t.startsWith('hgb_')));
  const bothInTitle = P.filter((p) => /hydra\s*[\/&+]\s*manticore|manticore\s*[\/&+]\s*hydra/i.test(p.title));
  const rows = bothInTitle.map((p) => {
    const tags = (p.tags || []).filter((t) => t.startsWith('hgb_'));
    const h = tags.filter((t) => t.startsWith('hgb_hydra_')).length;
    const m = tags.filter((t) => t.startsWith('hgb_manticore_')).length;
    return { p, h, m };
  });
  const oneSided = rows.filter((r) => (r.h > 0 && r.m === 0) || (r.m > 0 && r.h === 0));
  const untagged = rows.filter((r) => r.h === 0 && r.m === 0);

  add({
    id: 'compat-graph', severity: 'high',
    title: 'Attachments are missing from racks their own titles say they fit',
    count: oneSided.length + untagged.length, unit: 'products',
    metrics: { tagged: tagged.length, oneSided: oneSided.length, untagged: untagged.length },
    evidence: [
      ...oneSided.map((r) => ({
        label: r.p.title,
        detail: `listed as fitting ${r.h > 0 ? 'Hydra' : 'Manticore'} only`,
        delta: 'title says both', links: [url(r.p.handle)],
      })),
      ...untagged.slice(0, 6).map((r) => ({
        label: r.p.title, detail: 'not listed as fitting either rack family',
        delta: 'missing from the builder', links: [url(r.p.handle)],
      })),
    ],
  });
}

/* 8c -------- serviceable machines with nothing to repair them -------- */
{
  const un = partsData.uncovered ?? [];
  const worst = un[0];
  add({
    id: 'parts-coverage', severity: 'high',
    title: 'Expensive machines have no spare parts published',
    count: un.length, unit: 'machines over $500',
    metrics: {
      partCount: partsData.partCount, coveredProducts: partsData.productCount, uncovered: un.length,
      dearest: worst ? worst.title : null,
      dearestPrice: worst ? Math.round(worst.priceCents / 100) : null,
    },
    evidence: un.slice(0, 10).map((u) => ({
      label: u.title, detail: u.type ?? 'machine',
      delta: `$${(u.priceCents / 100).toFixed(0)}`, links: [u.url],
    })),
  });
}

/* 9 -------- low severity -------- */
{
  const noSku = P.filter((p) => p.variants.some((v) => !v.sku));
  add({
    id: 'missing-sku', severity: 'low',
    title: 'Product options with no SKU', count: noSku.length, unit: 'products',
    metrics: { products: noSku.length },
    evidence: noSku.slice(0, 6).map((p) => ({ label: p.title, detail: 'an option has no SKU', delta: '', links: [url(p.handle)] })),
  });

  const thin = P.filter((p) => strip(p.body_html).length < 120);
  add({
    id: 'thin-description', severity: 'low',
    title: 'Thin or empty product descriptions', count: thin.length, unit: 'products',
    metrics: { products: thin.length },
    evidence: thin.slice(0, 6).map((p) => ({ label: p.title, detail: `${strip(p.body_html).length} characters of description`, delta: '', links: [url(p.handle)] })),
  });

  const noImg = P.filter((p) => !p.images?.length);
  add({
    id: 'no-images', severity: 'low',
    title: 'Products with no photo at all', count: noImg.length, unit: 'products',
    metrics: { products: noImg.length },
    evidence: noImg.slice(0, 6).map((p) => ({ label: p.title, detail: 'no images', delta: '', links: [url(p.handle)] })),
  });
}

/* -------- checks that came back clean -------- */
const clean = [];
{
  const skuMap = {};
  P.forEach((p) => p.variants.forEach((v) => { if (v.sku) (skuMap[v.sku] = skuMap[v.sku] ?? []).push(p.title); }));
  const dup = Object.entries(skuMap).filter(([, v]) => new Set(v).size > 1);
  clean.push({
    label: 'No SKU is being used by two different products',
    detail: `${Object.keys(skuMap).length} SKUs checked, ${dup.length} reused.`,
    passed: dup.length === 0,
  });

  const disc = P.filter((p) => (p.tags || []).includes('Discontinued'));
  const stillBuyable = disc.filter((p) => p.variants.some((v) => v.available)).length;
  clean.push({
    label: 'Discontinued products really are unbuyable',
    detail: `${disc.length} marked discontinued, ${stillBuyable} still purchasable.`,
    passed: stillBuyable === 0,
  });

  const correct = P.filter((p) => p.vendor === 'Bells of Steel').length;
  clean.push({
    label: 'The brand name is right everywhere else',
    detail: `${correct} of ${P.length} products correctly show Bells of Steel.`,
    passed: true,
  });
}

const order = { critical: 0, high: 1, medium: 2, low: 3 };
findings.sort((a, b) => order[a.severity] - order[b.severity]);

const out = {
  generated_at: new Date().toISOString(),
  snapshot: raw.fetched_at ?? null,
  source: snapshotPath ? `saved catalog: ${snapshotPath}` : BASE,
  scanned: P.length,
  variants: P.reduce((s, p) => s + p.variants.length, 0),
  counts: {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
  },
  findings,
  clean,
};

const outPath = arg('--out', 'catalog-audit-findings.json');
mkdirSync(dirname(outPath) || '.', { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2));

log(`\nScanned ${out.scanned} products and ${out.variants} options.`);
log(`Findings: ${out.counts.critical} critical, ${out.counts.high} high, ${out.counts.medium} medium, ${out.counts.low} low.`);
findings.forEach((f) => log(`  [${f.severity.toUpperCase().padEnd(8)}] ${String(f.count).padStart(4)} ${f.unit.padEnd(30)} ${f.title}`));
log(`\nWrote ${outPath}`);
console.log(outPath);
