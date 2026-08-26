// Builds the copilot's retrieval index + IDF table at build time.
// The index is the whole point: it decides what any answer is allowed to be grounded in.
import { readFileSync, writeFileSync } from 'node:fs';

const { products: P } = JSON.parse(readFileSync('data/catalog.json', 'utf8'));
const { parts } = JSON.parse(readFileSync('data/parts.json', 'utf8'));

const STOP = new Set('a an and are as at be by for from has have how i in is it its my of on or that the this to was what when where which will with you your do does can could would should my me'.split(' '));
const tok = (s) => (s || '').toLowerCase().replace(/[^a-z0-9./"\- ]/g, ' ').split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t));

const docs = P.map((p) => ({
  id: p.id,
  title: p.title,
  url: p.url,
  type: p.type && p.type !== 'Hidden' ? p.type : p.derivedType,
  family: p.family,
  hgb: p.hgb,
  priceCents: p.priceMinCents,
  priceMaxCents: p.priceMaxCents,
  available: p.available,
  specs: p.specs,
  snippet: p.text.slice(0, 240),
}));

// IDF so "rack" counts for less than "manticore".
const df = {};
docs.forEach((d) => Array.from(new Set([...tok(d.title), ...tok(d.type ?? ''), ...tok(d.snippet)])).forEach((t) => (df[t] = (df[t] ?? 0) + 1)));
const idf = {};
Object.entries(df).forEach(([t, n]) => (idf[t] = Math.log(1 + docs.length / n)));

/* Realistic tickets. Every expected answer below is derived from the catalogue data,
   not written from imagination - the page recomputes each one live. */
const tickets = [
  { q: 'Will the Hydra lat pulldown fit my Manticore four post rack?', why: 'compatibility across rack families - the trap question' },
  { q: 'I have a 7ft basement ceiling. Which power racks will actually fit?', why: 'dimensional, answerable from published specs' },
  { q: 'How tall is the Residential Power Rack?', why: 'dimensional, and the data does not exist' },
  { q: 'The back pad on my FID bench is torn, can I buy a replacement?', why: 'parts lookup' },
  { q: 'How much is the Manticore Half Rack?', why: 'price - and the catalogue disagrees with itself' },
  { q: 'Do you ship to Australia and what is the warranty period?', why: 'policy - deliberately outside the catalogue' },
];

// Titles that resolve to more than one live listing at different prices, so a
// price answer can warn the rep instead of quoting a number that may be the wrong one.
const byTitle = new Map();
P.forEach((p) => byTitle.set(p.title, [...(byTitle.get(p.title) ?? []), p]));
const dupPrices = {};
byTitle.forEach((v, title) => {
  if (v.length < 2 || !v.every((x) => x.variants.length === 1)) return;
  const rows = v.map((x) => ({ url: x.url, priceCents: x.priceMinCents, handle: x.handle }));
  if (new Set(rows.map((r) => r.priceCents)).size > 1) dupPrices[title] = rows;
});

writeFileSync('data/copilot.json', JSON.stringify({
  generated_at: new Date().toISOString(),
  docs, idf, tickets, dupPrices,
  parts: parts.map((p) => ({ name: p.name, sku: p.sku, machine: p.machine, priceCents: p.priceCents, url: p.url, available: p.available })),
}));

console.log(`copilot -> data/copilot.json`);
console.log(`  ${docs.length} docs, ${Object.keys(idf).length} terms in the IDF table`);
console.log(`  ${tickets.length} example tickets`);
