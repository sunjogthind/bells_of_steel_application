#!/usr/bin/env node
/**
 * bells-of-steel-mcp
 *
 * Exposes the Bells of Steel catalog to Claude Code as tools, so anyone at the
 * company can ask about products, compatibility and spare parts from the terminal
 * without knowing the SKU scheme or the hgb_ tag grammar.
 *
 * Reads the committed snapshot - no network calls, no API keys.
 *
 *   claude mcp add bells-of-steel -- node /path/to/mcp/server.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const here = dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(readFileSync(join(here, '..', 'data', f), 'utf8'));

const { products, fetched_at } = load('catalog.json');
const { findings } = load('audit.json');
const { parts } = load('parts.json');

const money = (c) => (c == null ? 'n/a' : `$${(c / 100).toFixed(2)}`);
const text = (s) => ({ content: [{ type: 'text', text: s }] });
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const search = (q, pool = products, limit = 8) => {
  const t = norm(q).split(' ').filter((x) => x.length > 1);
  return pool
    .map((p) => {
      const title = norm(p.title);
      let s = 0;
      if (title.includes(norm(q))) s += 50;
      t.forEach((tok) => { if (title.includes(tok)) s += 10; if (norm(p.text || '').includes(tok)) s += 1; });
      return { p, s };
    })
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((r) => r.p);
};

const RACK_FRAME = (title) =>
  /roc foldable 4 post|folding power rack/i.test(title) ? 'folding_4post'
  : /roc foldable 2 post|folding half rack/i.test(title) ? 'folding_2post'
  : /six post/i.test(title) ? '6post' : /four post/i.test(title) ? '4post'
  : /collegiate/i.test(title) ? 'collegiate' : /flat foot/i.test(title) ? 'flat'
  : /half rack/i.test(title) ? 'half' : /squat stand/i.test(title) ? 'squatstand' : null;

const server = new McpServer({ name: 'bells-of-steel', version: '1.0.0' });

server.registerTool('search_products', {
  title: 'Search the catalog',
  description: 'Find Bells of Steel products by name or description. Returns price, stock and URL.',
  inputSchema: { query: z.string().describe('What to look for, e.g. "manticore half rack" or "bumper plates"') },
}, async ({ query }) => {
  const hits = search(query);
  if (!hits.length) return text(`No products match "${query}".`);
  return text(hits.map((p) =>
    `${p.title}\n  ${money(p.priceMinCents)}${p.priceMaxCents !== p.priceMinCents ? `–${money(p.priceMaxCents)}` : ''} · ${p.available ? 'in stock' : 'out of stock'} · ${p.type || p.derivedType || 'untyped'}\n  ${p.url}`
  ).join('\n\n'));
});

server.registerTool('check_compatibility', {
  title: 'Check attachment compatibility',
  description: 'Check whether a rack attachment fits a given rack, using the hgb_ compatibility tags in the catalog. Says so explicitly when compatibility is not published rather than guessing.',
  inputSchema: {
    rack: z.string().describe('Rack model, e.g. "Manticore Four Post"'),
    attachment: z.string().describe('Attachment, e.g. "lat pulldown"'),
  },
}, async ({ rack, attachment }) => {
  const r = search(rack, products.filter((p) => p.hgb.some((t) => /_prebuilt$/.test(t))), 1)[0];
  if (!r) return text(`Could not identify a rack model from "${rack}".`);
  const fam = /hydra/i.test(r.title) ? 'hydra' : /manticore/i.test(r.title) ? 'manticore' : null;
  const frame = RACK_FRAME(r.title);
  if (!fam || !frame) return text(`${r.title} is not in the Hydra or Manticore families, and has no published attachment compatibility.`);

  // Prefer products that actually carry compatibility tags - a spare-parts listing
  // will otherwise outrank the attachment it belongs to on a plain name match.
  const notRack = products.filter((p) => !p.hgb.some((t) => /_prebuilt$/.test(t)));
  const tagged = notRack.filter((p) => p.hgb.some((t) => /^hgb_(hydra|manticore)_/.test(t)));
  const a = search(attachment, tagged, 1)[0] ?? search(attachment, notRack, 1)[0];
  if (!a) return text(`Could not identify an attachment from "${attachment}".`);

  const tags = a.hgb.filter((t) => /^hgb_(hydra|manticore)_/.test(t));
  if (!tags.length) return text(`"${a.title}" carries no rack compatibility tags at all, so compatibility with ${r.title} is not published. This needs a human to check the physical spec.`);

  const match = tags.filter((t) => t.startsWith(`hgb_${fam}_${frame}_`));
  const hole = fam === 'hydra' ? '5/8"' : '1"';
  return text(match.length
    ? `YES — "${a.title}" is tagged compatible with ${r.title} (${match[0]}).\n${money(a.priceMinCents)} · ${a.available ? 'in stock' : 'out of stock'}\n${a.url}`
    : `NO — "${a.title}" is not tagged for ${r.title}.\nThat rack uses ${hole} holes. The attachment is tagged for: ${tags.slice(0, 4).join(', ')}.\nHydra (5/8") and Manticore (1") hardware do not interchange.`);
});

server.registerTool('find_spare_part', {
  title: 'Find a spare part',
  description: 'Search the 68 published spare parts by plain-language description or SKU. Returns nothing rather than a nearest guess when there is no match.',
  inputSchema: { description: z.string().describe('e.g. "torn pad on FID bench" or a SKU like SP-FID-BACKPAD') },
}, async ({ description }) => {
  const t = norm(description).split(' ').filter((x) => x.length > 2);
  const hits = parts
    .map((p) => {
      const hay = norm(`${p.name} ${p.machine} ${p.sku ?? ''}`);
      return { p, s: t.reduce((acc, tok) => acc + (hay.includes(tok) ? 1 : 0), 0) };
    })
    .filter((r) => r.s > 0).sort((a, b) => b.s - a.s).slice(0, 6);
  if (!hits.length) return text(`No published spare part matches "${description}". Bells of Steel publishes ${parts.length} parts; anything outside that list needs a human.`);
  return text(hits.map(({ p }) => `${p.name}\n  ${p.sku} · ${money(p.priceCents)} · ${p.machine}${p.available ? '' : ' · OUT OF STOCK'}\n  ${p.url}`).join('\n\n'));
});

server.registerTool('catalog_health', {
  title: 'Catalog health findings',
  description: 'Data-quality findings against the storefront catalog, ordered by severity.',
  inputSchema: { severity: z.enum(['all', 'critical', 'high', 'medium', 'low']).optional().describe('Filter by severity') },
}, async ({ severity = 'all' }) => {
  const rows = severity === 'all' ? findings : findings.filter((f) => f.severity === severity);
  return text(`Snapshot ${fetched_at.slice(0, 10)} · ${products.length} products\n\n` +
    rows.map((f) => `[${f.severity.toUpperCase()}] ${f.count} ${f.unit} — ${f.title}\n  ${f.summary}\n  Fix: ${f.fix}`).join('\n\n'));
});

await server.connect(new StdioServerTransport());
