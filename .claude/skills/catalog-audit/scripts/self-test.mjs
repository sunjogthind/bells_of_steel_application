#!/usr/bin/env node
// Proves three things before anyone trusts a report:
//   1. a catalogue with nothing wrong produces a clean report, not an empty one;
//   2. every rule that fires has plain-language copy written for it;
//   3. where the portfolio repo is present, this portable engine agrees with its
//      scripts/audit.mjs on the same catalogue - the copies have not drifted.
//
// Usage: node self-test.mjs [--repo <path to bos-portfolio>]
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COPY } from '../references/plain-language.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const repo = (() => { const i = argv.indexOf('--repo'); return i >= 0 ? argv[i + 1] : resolve(here, '../../../..'); })();
const tmp = mkdtempSync(join(tmpdir(), 'catalog-audit-test-'));
const run = (script, args) => execFileSync('node', [join(here, script), ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

let failures = 0;
const check = (name, ok, note = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${note ? ` - ${note}` : ''}`);
  if (!ok) failures++;
};

/* ------------------------------------------------ 1. the clean-catalog case */
{
  const products = Array.from({ length: 12 }, (_, i) => ({
    id: 1000 + i, handle: `clean-product-${i}`, title: `Clean Product ${i}`,
    vendor: 'Bells of Steel', product_type: 'Barbell', tags: ['Barbells'],
    body_html: `<p>A perfectly ordinary product listing with more than enough description text to clear the thin-content check, written out at length so the character count is comfortably past the threshold.</p>`,
    images: [{ src: 'https://example.invalid/a.jpg' }],
    variants: [{
      id: 2000 + i, title: 'Default Title', price: '199.00', compare_at_price: null,
      sku: `SKU-${i}`, available: true, grams: 12000, requires_shipping: true,
    }],
  }));
  const snap = join(tmp, 'clean-raw.json');
  writeFileSync(snap, JSON.stringify({ fetched_at: new Date().toISOString(), products }));
  const out = join(tmp, 'clean-findings.json');
  run('run-audit.mjs', ['--snapshot', snap, '--out', out, '--quiet']);
  const A = JSON.parse(readFileSync(out, 'utf8'));
  check('a clean catalogue produces zero findings', A.findings.length === 0, `${A.findings.length} found`);
  check('a clean catalogue still reports its passed checks', (A.clean ?? []).length > 0);

  const md = run('render-report.mjs', [out]);
  check('the clean report says so in words', /Nothing needs attention/.test(md));
  check('the clean report is not empty', md.length > 400 && /came back clean/i.test(md));
}

/* ---------------------------------------- 2. every firing rule has copy */
const repoSnapshot = join(repo, 'data', 'catalog-raw.json');
let realFindings = null;
if (existsSync(repoSnapshot)) {
  const out = join(tmp, 'real-findings.json');
  run('run-audit.mjs', ['--snapshot', repoSnapshot, '--out', out, '--quiet']);
  realFindings = JSON.parse(readFileSync(out, 'utf8'));

  const missing = realFindings.findings.filter((f) => !COPY[f.id]).map((f) => f.id);
  check('every finding has plain-language copy', missing.length === 0, missing.join(', '));

  const md = run('render-report.mjs', [out]);
  // Word-bounded: an unbounded '301' matches the price $1301.86 and fails for nothing.
  const jargon = [/\bBM25\b/, /\bregex\b/i, /\bnormali[sz]ation\b/i, /\bproduct_type\b/, /\bcompare_at_price\b/,
    /\bbody_html\b/, /hgb_/, /\bLTL\b/, /\bBigQuery\b/, /\bLooker\b/, /\b301\b/, /\bJSON\b/, /\bAPI\b/, /\bvariant_id\b/];
  const found = jargon.filter((re) => re.test(md)).map((re) => re.source);
  check('the report contains no engineering jargon', found.length === 0, found.join(', '));
  check('the report has no exclamation marks', !md.includes('!'));

  const unresolved = md.match(/\{[a-zA-Z]+\}/g);
  check('every placeholder was filled from the data', !unresolved, (unresolved ?? []).join(', '));

  const overlong = md.split('\n').filter((l) => l.length > 700 && !l.startsWith('- ') && !l.startsWith('|'));
  check('no paragraph runs away with itself', overlong.length === 0, `${overlong.length} over 700 chars`);
} else {
  console.log(`SKIP  catalogue checks - no saved catalogue at ${repoSnapshot}`);
}

/* ------------------------------- 3. parity with the portfolio repo's audit */
const repoAudit = join(repo, 'data', 'audit.json');
if (realFindings && existsSync(repoAudit)) {
  const R = JSON.parse(readFileSync(repoAudit, 'utf8'));
  const mine = new Map(realFindings.findings.map((f) => [f.id, f]));
  const theirs = R.findings.filter((f) => f.count > 0);
  const diffs = [];
  theirs.forEach((t) => {
    const m = mine.get(t.id);
    if (!m) return diffs.push(`${t.id}: missing from the portable engine`);
    if (m.count !== t.count) diffs.push(`${t.id}: ${m.count} vs ${t.count}`);
    if (m.severity !== t.severity) diffs.push(`${t.id}: severity ${m.severity} vs ${t.severity}`);
  });
  mine.forEach((m, id) => { if (!theirs.some((t) => t.id === id)) diffs.push(`${id}: extra in the portable engine`); });
  check(`portable engine matches the repo audit on all ${theirs.length} findings`, diffs.length === 0, diffs.join('; '));
  check('same products scanned', realFindings.scanned === R.scanned, `${realFindings.scanned} vs ${R.scanned}`);
} else {
  console.log('SKIP  parity check - the portfolio repo audit is not available here');
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check${failures === 1 ? '' : 's'} failed.`);
process.exit(failures === 0 ? 0 : 1);
