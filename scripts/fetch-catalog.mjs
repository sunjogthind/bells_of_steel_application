// Pulls the public Bells of Steel Shopify catalogue into a local snapshot.
// Polite: 250/page, 600ms between pages, identifies itself.
import { writeFileSync } from 'node:fs';

const BASE = 'https://bellsofsteel.com/products.json';
const UA = 'bos-internal-tools-demo/1.0 (portfolio demo; contact ranasunj@ualberta.ca)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const all = [];
for (let page = 1; page <= 40; page++) {
  const res = await fetch(`${BASE}?limit=250&page=${page}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) { console.error(`page ${page} -> HTTP ${res.status}`); break; }
  const { products } = await res.json();
  if (!products?.length) break;
  all.push(...products);
  console.error(`page ${page}: +${products.length} (total ${all.length})`);
  // Shopify can return fewer than the limit while more pages remain - page until empty.
  await sleep(600);
}

writeFileSync('data/catalog-raw.json', JSON.stringify({
  fetched_at: new Date().toISOString(),
  source: BASE,
  count: all.length,
  products: all,
}, null, 2));
console.error(`\nwrote data/catalog-raw.json, ${all.length} products`);
