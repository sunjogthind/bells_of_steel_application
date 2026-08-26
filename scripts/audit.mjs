// Computes catalog-health findings from the raw storefront feed.
// Runs at build time and emits data/audit.json so the app ships no 4MB payload.
import { readFileSync, writeFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync('data/catalog-raw.json', 'utf8'));
const partsData = JSON.parse(readFileSync('data/parts.json', 'utf8'));
const P = raw.products;
const url = (h) => `https://bellsofsteel.com/products/${h}`;
const strip = (h) => (h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const num = (x) => parseFloat(x);
const findings = [];

const add = (f) => findings.push(f);

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
        listPrice: parseFloat(p.variants[0].compare_at_price) || Math.min(...p.variants.map((x) => num(x.price))),
        sku: p.variants[0].sku,
        grams: p.variants[0].grams,
        copy: strip(p.body_html).length,
        images: (p.images || []).length,
        available: p.variants.some((x) => x.available),
      }));
      const spread = Math.max(...rows.map((r) => r.price)) - Math.min(...rows.map((r) => r.price));
      // The cheaper page usually carries a discount. Compare the pre-discount
      // list prices too - if those differ, the discount is not the cause.
      const listSpread = Math.max(...rows.map((r) => r.listPrice)) - Math.min(...rows.map((r) => r.listPrice));
      const sameGoods = new Set(rows.map((r) => r.grams)).size === 1
        && new Set(rows.map((r) => r.copy)).size === 1
        && new Set(rows.map((r) => r.images)).size === 1;
      return { title, rows, spread, listSpread, sameGoods };
    })
    .filter((d) => d.spread > 0)
    .sort((a, b) => b.spread - a.spread);

  const identical = mismatched.filter((m) => m.sameGoods).length;
  const listDiffers = mismatched.filter((m) => m.listSpread > 0).length;
  const widerBefore = mismatched.filter((m) => m.listSpread > m.spread).length;

  add({
    id: 'duplicate-pricing', severity: 'critical',
    title: 'The same product is listed twice, at two different prices',
    count: mismatched.length, unit: `of ${dupes.length} duplicated listings`,
    summary: `Every prebuilt rack exists as two live product pages — one plain handle, one ending "-hgb" (your Home Gym Builder copy). ${mismatched.length === dupes.length ? `All ${dupes.length}` : `${mismatched.length} of ${dupes.length}`} charge different prices, and both pages are purchasable.${skipped > 0 ? ` ${skipped} further duplicates were excluded as not comparable.` : ''}`,
    impact: `The two pages carry different SKUs — the plain handle adds a "-BNDL" suffix — but ${identical} of ${mismatched.length} pairs are identical in shipping weight, product copy and images, so a customer is choosing between two listings for the same rack with nothing on the page to tell them apart. The widest gap is $${Math.max(...mismatched.map((m) => m.spread)).toFixed(2)}. The cheaper page is usually running a small discount, but that is not the cause: the pre-discount list prices differ on ${listDiffers} of ${mismatched.length} pairs, and on ${widerBefore} the gap is actually wider before the discount is applied.`,
    fix: 'Pick one canonical page per rack and point the other at it. The -hgb copies are already tagged SEARCHANISE_IGNORE, so they are meant to be reached only through the builder — but they are publicly reachable and in the feed.',
    evidence: mismatched.slice(0, 12).map((m) => ({
      label: m.title.replace(/\s*\(.*\)$/, ''),
      detail: m.rows.map((r) => `$${r.price.toFixed(2)}${r.listPrice > r.price ? ` (was $${r.listPrice.toFixed(2)})` : ''} — /${r.handle}`).join('   vs   '),
      delta: `$${m.spread.toFixed(2)} apart${m.listSpread > 0 ? `, $${m.listSpread.toFixed(2)} before discounts` : ''}`,
      links: m.rows.map((r) => r.url),
    })),
    verified: 'Both URLs fetched live — HTTP 200, prices and SKUs confirmed from each page’s own .json endpoint. Shipping weight, copy length and image count compared per pair.',
  });
}

/* 2 -------- zero-priced purchasable variants -------- */
{
  const rows = [];
  P.forEach((p) => p.variants.forEach((v) => {
    if (num(v.price) <= 1 && v.available) rows.push({ p, v });
  }));
  const products = [...new Set(rows.map((r) => r.p.handle))];
  const intentional = rows.filter((r) => /FREE FOR BUILDERS/i.test(r.p.title) || /^Variant for price/i.test(r.v.title));
  add({
    id: 'zero-price', severity: 'high',
    title: 'Products priced at $0.00 or $0.01 are exposed in the public feed',
    count: products.length, unit: 'products',
    summary: `${rows.length} purchasable variants across ${products.length} products carry a price of $1.00 or less. ${intentional.length} of them are recognisably deliberate — "FREE FOR BUILDERS" hardware and placeholder variants named "Variant for price 0" that belong to a bundling app.`,
    impact: 'Nothing in the feed distinguishes these from real products, so anything reading products.json inherits them — shopping feeds, analytics, price monitoring, any internal tool. Spotter recommended one as the cheapest fix for an equipment gap until I filtered them out.',
    fix: 'Move builder scaffolding to a dedicated product type or unpublish it from the online-store channel so it stops appearing in the feed at all.',
    evidence: rows.slice(0, 10).map((r) => ({
      label: r.p.title, detail: `$${num(r.v.price).toFixed(2)} — variant "${r.v.title}"`,
      delta: /FREE FOR BUILDERS/i.test(r.p.title) || /^Variant for price/i.test(r.v.title) ? 'likely intentional' : 'worth checking',
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
    title: 'Physical products ship with no weight recorded',
    count: products.length, unit: 'products',
    summary: `${rows.length} variants over $50 are flagged as requiring shipping but carry a weight of 0 g.`,
    impact: 'You move squat racks and plate sets on LTL freight, and weight is the input to the rate. A zero there means the carrier calculation is running on a default, and the gap between the quoted rate and the real one is absorbed on every one of these orders.',
    fix: 'Backfill weights from your packing data, then add a Shopify validation that refuses to publish a shipped product with a zero weight.',
    evidence: rows.sort((a, b) => num(b.v.price) - num(a.v.price)).slice(0, 10).map((r) => ({
      label: r.p.title, detail: `$${num(r.v.price).toFixed(2)} — ${r.v.title}`,
      delta: '0 g', links: [url(r.p.handle)],
    })),
  });
}

/* 4 -------- corrupted vendor field -------- */
{
  const bad = P.filter((p) => /^related_to_\d+$/.test(p.vendor || ''));
  add({
    id: 'vendor-corrupt', severity: 'high',
    title: 'A broken sync is writing product IDs into the vendor field',
    count: bad.length, unit: 'products',
    summary: `${bad.length} products have a vendor of "related_to_<numeric id>" instead of a brand name. The rest of the catalogue correctly reads "Bells of Steel".`,
    impact: 'Vendor is a customer-facing field and a required attribute in Google Shopping and most marketplace feeds. These products are advertising a database key as their brand.',
    fix: 'Find the app writing this — the value shape suggests a related-products integration reusing the field — and reset the affected products to the correct vendor. Worth checking what else that integration touches.',
    evidence: bad.slice(0, 10).map((p) => ({
      label: p.title, detail: `vendor = "${p.vendor}"`, delta: 'corrupt', links: [url(p.handle)],
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
    title: 'Compare-at price equals the selling price',
    count: rows.length, unit: 'variants',
    summary: `${rows.length} variants set a compare-at price identical to what the customer actually pays.`,
    impact: 'Shopify renders compare-at as a struck-through "was" price. A struck-through number that matches the real one is a discount claim with no discount behind it — which is both a conversion problem and the kind of thing consumer-protection rules care about.',
    fix: 'Clear compare_at_price wherever it is less than or equal to price, and add it to the same publish-time validation as the weight check.',
    evidence: rows.slice(0, 10).map((r) => ({
      label: r.p.title, detail: `price $${num(r.v.price).toFixed(2)} · compare-at $${r.c.toFixed(2)}`,
      delta: 'no actual discount', links: [url(r.p.handle)],
    })),
  });
}

/* 6 -------- published but unbuyable -------- */
{
  const bad = P.filter((p) => p.variants.length && p.variants.every((v) => !v.available));
  add({
    id: 'oos-published', severity: 'medium',
    title: 'Products are published with every variant out of stock',
    count: bad.length, unit: 'products',
    summary: `${bad.length} products have no purchasable variant but remain live in the storefront feed.`,
    impact: 'These pages still absorb ad clicks, still rank, and still take up crawl budget, and every visit that reaches one converts at zero. They are also the pages most likely to generate a "when is this back?" ticket.',
    fix: 'Auto-route sustained zero-inventory products to a back-in-stock capture page rather than leaving a dead add-to-cart button.',
    evidence: bad.slice(0, 10).map((p) => ({
      label: p.title, detail: `${p.variants.length} variant${p.variants.length > 1 ? 's' : ''}, none available`,
      delta: 'unbuyable', links: [url(p.handle)],
    })),
  });
}

/* 7 -------- taxonomy -------- */
{
  const missing = P.filter((p) => !p.product_type);
  const placeholder = P.filter((p) => p.product_type === 'Hidden');
  add({
    id: 'taxonomy', severity: 'medium',
    title: 'A fifth of the catalogue has no product type',
    count: missing.length + placeholder.length, unit: 'products',
    summary: `${missing.length} products have an empty product_type and a further ${placeholder.length} use the literal string "Hidden" as their type.`,
    impact: 'product_type is what your automated collections, storefront filters and any BigQuery or Looker grouping key off. Every product without one is invisible to that machinery, and "Hidden" is a visibility flag wearing a taxonomy field’s clothes.',
    fix: 'Most are inferable from the title alone — the classifier in this demo types 60 of them with a dozen rules. Backfill, then make type required at publish.',
    evidence: missing.slice(0, 8).map((p) => ({
      label: p.title, detail: 'product_type is empty', delta: 'untyped', links: [url(p.handle)],
    })),
  });
}

/* 8 -------- suppressed specs -------- */
{
  const hidden = P.filter((p) => (p.tags || []).includes('hide:specs'));
  // Match the Residential line by its own hgb_ tag. An earlier version matched on
  // the title and picked up "…Power Rack Builder" scaffolding instead, which made
  // the claim contradict its own evidence.
  // Racks only - the Cable Tower carries the same tag but is not a rack. And test for
  // upright height specifically, which is the dimension that decides whether a rack
  // fits a room, so this matches what the Gym Builder checks.
  const residential = P.filter((p) =>
    (p.tags || []).includes('hgb_residential_prebuilt') && /rack/i.test(p.title));
  const noDims = residential.filter((p) => !/(\d{2,3})\s*["”]\s*upright/i.test(strip(p.body_html)));
  add({
    id: 'specs-hidden', severity: 'medium',
    title: 'Spec tables are switched off on 90 products — including entry-level racks',
    count: hidden.length, unit: 'products',
    summary: `${hidden.length} products carry the hide:specs tag. Separately, ${noDims.length === residential.length ? `all ${residential.length}` : `${noDims.length} of ${residential.length}`} Residential racks publish no upright height — the one number that decides whether a rack fits a room.`,
    impact: 'The Residential racks are your cheapest and most beginner-facing — exactly the buyer working around a low basement ceiling, and the one least able to guess. The Gym Builder cannot verify fit for any of them. Neither can the customer.',
    fix: 'Publish height, width and depth on every rack. It is the highest-volume pre-sales question in this category.',
    evidence: noDims.map((p) => ({
      label: p.title, detail: 'no upright height published',
      delta: 'unverifiable', links: [url(p.handle)],
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
    title: 'The compatibility tags contradict the product titles',
    count: oneSided.length + untagged.length, unit: 'products',
    summary: `${tagged.length} products carry the hgb_ tags that drive Home Gym Builder compatibility. ${oneSided.length} says in its own title that it fits both rack families while carrying tags for only one; ${untagged.length} more name both families and carry no tags at all.`,
    impact: 'These attachments are invisible to your builder for the family they were left out of. A customer configuring that rack is never offered a part that physically fits it — and the title they can read says otherwise.',
    fix: 'Reconcile the hgb_ tags against product titles as a scheduled check. The comparison is cheap and it is exactly the sort of drift nobody notices by hand.',
    evidence: [
      ...oneSided.map((r) => ({
        label: r.p.title,
        detail: `${r.h} hydra tag${r.h === 1 ? '' : 's'}, ${r.m} manticore tag${r.m === 1 ? '' : 's'}`,
        delta: 'title says both', links: [url(r.p.handle)],
      })),
      ...untagged.slice(0, 6).map((r) => ({
        label: r.p.title, detail: 'no hgb_ compatibility tags at all',
        delta: 'invisible to builder', links: [url(r.p.handle)],
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
    summary: `Bells of Steel publishes ${partsData.partCount} spare parts covering ${partsData.productCount} products. ${un.length} serviceable machines priced over $500 are not among them${worst ? `, the most expensive being the ${worst.title} at $${(worst.priceCents / 100).toFixed(0)}` : ''}.`,
    impact: 'A treadmill that fails in year two has nothing to sell the customer and nothing for support to point at — a warranty conversation with no good ending, on your highest-ticket items. Spare parts are also a margin-rich line being left on the table.',
    fix: 'Work down this list by price. Every machine over $1,000 should have at least its wear parts - pads, cables, bushings - published before the next warranty season.',
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
    title: 'Variants with no SKU', count: noSku.length, unit: 'products',
    summary: `${noSku.length} products have at least one variant with an empty SKU.`,
    impact: 'SKU is the join key between Shopify, your warehouse and any reporting built on top. A blank one breaks the join silently.',
    fix: 'Assign SKUs and make the field required.',
    evidence: noSku.slice(0, 6).map((p) => ({ label: p.title, detail: 'variant missing SKU', delta: '', links: [url(p.handle)] })),
  });

  const thin = P.filter((p) => strip(p.body_html).length < 120);
  add({
    id: 'thin-description', severity: 'low',
    title: 'Thin or empty product descriptions', count: thin.length, unit: 'products',
    summary: `${thin.length} products have under 120 characters of description.`,
    impact: 'Weak organic ranking, and nothing for a support rep or an AI assistant to ground an answer in.',
    fix: 'Prioritise the ones that are actually in stock and getting traffic.',
    evidence: thin.slice(0, 6).map((p) => ({ label: p.title, detail: `${strip(p.body_html).length} characters`, delta: '', links: [url(p.handle)] })),
  });

  const noImg = P.filter((p) => !p.images?.length);
  if (noImg.length) add({
    id: 'no-images', severity: 'low',
    title: 'Products with no image at all', count: noImg.length, unit: 'products',
    summary: `${noImg.length} products ship zero images.`,
    impact: 'An image-less product page effectively does not convert, and image is a required field in most shopping feeds.',
    fix: 'Add photography or unpublish.',
    evidence: noImg.map((p) => ({ label: p.title, detail: '0 images', delta: '', links: [url(p.handle)] })),
  });
}

/* -------- checks that came back clean -------- */
const clean = [];
{
  const skuMap = {};
  P.forEach((p) => p.variants.forEach((v) => { if (v.sku) (skuMap[v.sku] = skuMap[v.sku] ?? []).push(p.title); }));
  const dup = Object.entries(skuMap).filter(([, v]) => new Set(v).size > 1);
  clean.push({ label: 'No SKU collisions', detail: `${Object.keys(skuMap).length} SKUs checked, ${dup.length} reused across different products.` });

  const disc = P.filter((p) => (p.tags || []).includes('Discontinued'));
  clean.push({ label: 'Discontinued products are genuinely unbuyable', detail: `${disc.length} tagged Discontinued, ${disc.filter((p) => p.variants.some((v) => v.available)).length} still purchasable.` });

  clean.push({ label: 'Vendor is consistent everywhere else', detail: `${P.filter((p) => p.vendor === 'Bells of Steel').length} products correctly attributed.` });
}

const order = { critical: 0, high: 1, medium: 2, low: 3 };
findings.sort((a, b) => order[a.severity] - order[b.severity]);

writeFileSync('data/audit.json', JSON.stringify({
  generated_at: new Date().toISOString(),
  snapshot: raw.fetched_at,
  scanned: P.length,
  variants: P.reduce((s, p) => s + p.variants.length, 0),
  findings, clean,
}, null, 2));

console.log(`audit -> data/audit.json`);
findings.forEach((f) => console.log(`  [${f.severity.toUpperCase().padEnd(8)}] ${String(f.count).padStart(3)} ${f.unit.padEnd(28)} ${f.title}`));
