#!/usr/bin/env node
// Turns the findings file into something a merch coordinator can read and act on.
//
// Deterministic on purpose. Every sentence is either measured by the engine or written
// by hand in references/plain-language.mjs - nothing here composes prose, so no number
// in the output can be one the catalog did not produce.
//
// Usage:
//   node render-report.mjs <findings.json> --md <out.md> --html <out.html> [--fragment <out.html>]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COPY, SEVERITY, SEVERITY_ORDER, fill } from '../references/plain-language.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const input = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true)
  ?? argv[0];
if (!input) { console.error('Usage: node render-report.mjs <findings.json> --md <out.md> --html <out.html>'); process.exit(1); }

const A = JSON.parse(readFileSync(resolve(input), 'utf8'));

/* ------------------------------------------------------------ formatting */

const n = (x) => Number(x).toLocaleString('en-CA');
const plural = (c, one, many) => (c === 1 ? one : many);
/** Small counts read better spelled out in a headline sentence. */
const WORDS = ['no', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const word = (x) => (x <= 10 ? WORDS[x] : n(x));
// en-GB day-month-year, matching the date format used across the rest of the portfolio.
const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Edmonton' });
const DATETIME = new Intl.DateTimeFormat('en-CA', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const when = (iso) => (iso ? DATE.format(new Date(iso)) : 'an unknown date');
const whenExact = (iso) => (iso ? DATETIME.format(new Date(iso)) : 'unknown');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Copy for a finding, with its own measurements substituted in. A rule the copy file
 *  has not caught up with is reported as such rather than dropped or paraphrased. */
function copyFor(f) {
  const c = COPY[f.id];
  if (!c) {
    return {
      title: f.title,
      what: `${n(f.count)} ${f.unit}. This check is newer than the plain-language notes in this skill, so what follows is the rule's own wording.`,
      why: null, do: null, untranslated: true,
    };
  }
  const m = { ...(f.metrics ?? {}), count: f.count };
  const parts = [fill(c.what, m)];
  for (const [key, extra] of Object.entries(c.what_if ?? {})) {
    if (m[key]) parts.push(fill(extra, m));
  }
  return { title: c.title, what: parts.join(' '), why: fill(c.why, m), do: fill(c.do, m), untranslated: false };
}

const F = A.findings.map((f) => ({ ...f, copy: copyFor(f) }));
const total = F.length;
const c = A.counts ?? { critical: 0, high: 0, medium: 0, low: 0 };

/** The five-second answer. Honest about the clean case rather than padding it. */
function verdict() {
  if (total === 0) {
    return {
      line: 'Nothing needs attention.',
      detail: `Every check came back clean against ${n(A.scanned)} products. A clean run is a real result: the rules ran, they found nothing, and that is worth knowing.`,
    };
  }
  if (c.critical > 0) {
    return {
      line: `${word(c.critical)} ${plural(c.critical, 'thing needs', 'things need')} attention today.`,
      detail: `${plural(c.critical, 'It is', 'They are')} at the top of this report. Below that, ${n(c.high)} high, ${n(c.medium)} medium and ${n(c.low)} low findings that can wait their turn.`,
    };
  }
  if (c.high > 0) {
    return {
      line: 'Nothing critical today.',
      detail: `${word(c.high)} high-severity ${plural(c.high, 'finding is', 'findings are')} costing you something on every affected order, and ${plural(c.high, 'is', 'are')} worth this week. ${n(c.medium + c.low)} lower-priority ${plural(c.medium + c.low, 'item', 'items')} below that.`,
    };
  }
  return {
    line: 'Nothing urgent today.',
    detail: `${word(total)} ${plural(total, 'finding', 'findings')}, none of them critical or high. Worth planning in rather than dropping other work for.`,
  };
}
const V = verdict();

/* ------------------------------------------------------------- markdown */

function markdown() {
  const L = [];
  L.push(`# Catalog health check`);
  L.push('');
  L.push(`Run ${when(A.generated_at)} against your live storefront catalog.`);
  L.push('');
  L.push(`**${V.line}** ${V.detail}`);
  L.push('');
  L.push(`Checked ${n(A.scanned)} products and ${n(A.variants)} product options.`);
  L.push('');

  if (total > 0) {
    L.push('| | Findings | What this level means |');
    L.push('|---|---|---|');
    for (const s of SEVERITY_ORDER) {
      if (!c[s]) continue;
      L.push(`| **${SEVERITY[s].label}** | ${c[s]} | ${SEVERITY[s].meaning} |`);
    }
    L.push('');
    L.push('---');
    L.push('');
  }

  F.forEach((f, i) => {
    const rank = String(i + 1).padStart(2, '0');
    L.push(`## ${rank}. ${f.copy.title}`);
    L.push('');
    L.push(`**${SEVERITY[f.severity].label}** — ${SEVERITY[f.severity].meaning}  `);
    L.push(`**${n(f.count)} ${f.unit}**`);
    L.push('');
    L.push(f.copy.what);
    if (f.copy.why) { L.push(''); L.push(f.copy.why); }
    if (f.copy.do) { L.push(''); L.push(`**What to do:** ${f.copy.do}`); }

    if (f.evidence?.length) {
      L.push('');
      const shown = f.evidence.length;
      L.push(shown < f.count
        ? `Affected products (${shown} of ${n(f.count)} shown):`
        : `Affected products:`);
      L.push('');
      f.evidence.forEach((e) => {
        const links = (e.links ?? []).filter(Boolean);
        const head = links.length === 1 ? `[${e.label}](${links[0]})` : `**${e.label}**`;
        const bits = [e.detail, e.delta].filter(Boolean).join(' — ');
        const extra = links.length > 1 ? ` (${links.map((u, k) => `[page ${k + 1}](${u})`).join(' · ')})` : '';
        L.push(`- ${head}${bits ? ` — ${bits}` : ''}${extra}`);
      });
    }
    L.push('');
  });

  if (A.clean?.length) {
    L.push('---');
    L.push('');
    L.push('## Checks that came back clean');
    L.push('');
    A.clean.forEach((k) => L.push(`- **${k.label}.** ${k.detail}`));
    L.push('');
  }

  L.push('---');
  L.push('');
  L.push(`Source: ${A.source}. Catalog read ${whenExact(A.snapshot)}. Report generated ${whenExact(A.generated_at)}.`);
  L.push('');
  L.push(`Every number above is counted from your published storefront catalog. Where the catalog does not publish something, this report says so rather than estimating it.`);
  L.push('');
  return L.join('\n');
}

/* ----------------------------------------------------------------- html */

const STYLE = `
:root{
  --ground:#F5F6F8; --surface:#FFFFFF; --sunk:#EEF0F4;
  --ink:#171A20; --body:#333A45; --muted:#68717F; --line:#DCE0E7;
  --accent:#39507F; --accent-soft:#E7EBF3;
  --critical:#A8261C; --high:#B0601A; --medium:#6E6220; --low:#5A6470;
  --stripe-critical:#A8261C; --stripe-high:#B0601A; --stripe-medium:#6E6220; --stripe-low:#98A0AC;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --ground:#111318; --surface:#191C22; --sunk:#20242B;
    --ink:#EDEFF3; --body:#C3C9D3; --muted:#8B94A2; --line:#2B303A;
    --accent:#93AEE0; --accent-soft:#232B3A;
    --critical:#E9776B; --high:#E0A265; --medium:#C4B76A; --low:#9AA3B0;
    --stripe-critical:#C4402F; --stripe-high:#C07C2C; --stripe-medium:#8A7C2C; --stripe-low:#586170;
  }
}
:root[data-theme="dark"]{
  --ground:#111318; --surface:#191C22; --sunk:#20242B;
  --ink:#EDEFF3; --body:#C3C9D3; --muted:#8B94A2; --line:#2B303A;
  --accent:#93AEE0; --accent-soft:#232B3A;
  --critical:#E9776B; --high:#E0A265; --medium:#C4B76A; --low:#9AA3B0;
  --stripe-critical:#C4402F; --stripe-high:#C07C2C; --stripe-medium:#8A7C2C; --stripe-low:#586170;
}

*{box-sizing:border-box}
body{
  margin:0; background:var(--ground); color:var(--body);
  font-family:"Source Serif 4",Georgia,"Times New Roman",serif;
  font-size:17px; line-height:1.62;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:940px; margin:0 auto; padding:56px 24px 96px; display:flex; flex-direction:column; gap:40px}
h1,h2,h3,.chip,.tile-n,.eyebrow{font-family:Archivo,"Helvetica Neue",Arial,sans-serif}
code,.mono,.tile-n,.rank,.chip{font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace}

/* ---- masthead ---- */
.masthead{display:flex; flex-direction:column; gap:14px; border-bottom:2px solid var(--ink); padding-bottom:26px}
.eyebrow{
  font-size:11px; letter-spacing:.16em; text-transform:uppercase;
  color:var(--muted); font-weight:600;
}
h1{
  font-size:clamp(30px,5vw,44px); line-height:1.08; margin:0; color:var(--ink);
  font-weight:700; letter-spacing:-.015em; text-wrap:balance;
}
.dateline{font-size:14px; color:var(--muted); font-family:"IBM Plex Mono",monospace}

/* ---- verdict ---- */
.verdict{
  background:var(--surface); border:1px solid var(--line); border-left:5px solid var(--accent);
  padding:24px 26px; display:flex; flex-direction:column; gap:10px;
}
.verdict .line{font-family:Archivo,sans-serif; font-weight:700; font-size:clamp(20px,3vw,26px); color:var(--ink); line-height:1.25; text-wrap:balance}
.verdict .detail{margin:0; max-width:64ch}
.verdict.clean{border-left-color:var(--stripe-low)}

/* ---- severity tiles ---- */
.tiles{display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1px; background:var(--line); border:1px solid var(--line)}
.tile{background:var(--surface); padding:16px 18px; display:flex; flex-direction:column; gap:6px}
.tile-head{display:flex; align-items:baseline; gap:10px}
.tile-n{font-size:30px; font-weight:700; color:var(--ink); font-variant-numeric:tabular-nums; line-height:1}
.tile-label{font-family:Archivo,sans-serif; font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase}
.tile-mean{font-size:13.5px; line-height:1.45; color:var(--muted); margin:0}
.tile[data-sev="critical"] .tile-label{color:var(--critical)}
.tile[data-sev="high"] .tile-label{color:var(--high)}
.tile[data-sev="medium"] .tile-label{color:var(--medium)}
.tile[data-sev="low"] .tile-label{color:var(--low)}

/* ---- findings ---- */
.findings{display:flex; flex-direction:column; gap:28px}
.finding{background:var(--surface); border:1px solid var(--line); border-left:5px solid var(--stripe-low); padding:26px 28px; display:flex; flex-direction:column; gap:14px}
.finding[data-sev="critical"]{border-left-color:var(--stripe-critical)}
.finding[data-sev="high"]{border-left-color:var(--stripe-high)}
.finding[data-sev="medium"]{border-left-color:var(--stripe-medium)}
.f-top{display:flex; flex-wrap:wrap; align-items:center; gap:10px}
.rank{font-size:12px; color:var(--muted); font-variant-numeric:tabular-nums}
.chip{font-size:10.5px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; padding:3px 8px; border:1px solid currentColor}
.chip[data-sev="critical"]{color:var(--critical)}
.chip[data-sev="high"]{color:var(--high)}
.chip[data-sev="medium"]{color:var(--medium)}
.chip[data-sev="low"]{color:var(--low)}
.count{font-family:"IBM Plex Mono",monospace; font-size:13px; color:var(--ink); font-variant-numeric:tabular-nums}
.means{font-size:13px; color:var(--muted); font-family:Archivo,sans-serif}
h2{font-size:clamp(20px,3vw,25px); line-height:1.22; margin:0; color:var(--ink); font-weight:700; letter-spacing:-.01em; text-wrap:balance}
.finding p{margin:0; max-width:66ch}
.todo{background:var(--sunk); padding:14px 16px; border-left:2px solid var(--accent)}
.todo strong{font-family:Archivo,sans-serif; font-size:11px; letter-spacing:.13em; text-transform:uppercase; color:var(--accent); display:block; margin-bottom:4px}

/* ---- evidence ---- */
.ev-head{font-family:Archivo,sans-serif; font-size:11px; letter-spacing:.13em; text-transform:uppercase; color:var(--muted); font-weight:600; margin:6px 0 0}
.ev-scroll{overflow-x:auto}
table{border-collapse:collapse; width:100%; font-size:14.5px; min-width:520px}
th,td{text-align:left; padding:9px 14px 9px 0; border-bottom:1px solid var(--line); vertical-align:top}
th{font-family:Archivo,sans-serif; font-size:10.5px; letter-spacing:.11em; text-transform:uppercase; color:var(--muted); font-weight:600; border-bottom-color:var(--ink)}
td.detail,td.delta{font-family:"IBM Plex Mono",monospace; font-size:12.5px; color:var(--muted); font-variant-numeric:tabular-nums}
td.delta{white-space:nowrap; color:var(--ink); text-align:right; padding-right:0}
td.product{width:30%; min-width:190px; padding-right:22px}
th:last-child{text-align:right}
tr:last-child td{border-bottom:none}
a{color:var(--accent); text-decoration:underline; text-underline-offset:2px; text-decoration-thickness:1px}
a:hover{text-decoration-thickness:2px}
a:focus-visible{outline:2px solid var(--accent); outline-offset:2px}
.also{font-size:12.5px; color:var(--muted); white-space:nowrap; display:inline-block}

/* ---- clean ---- */
.clean-list{display:flex; flex-direction:column; gap:1px; background:var(--line); border:1px solid var(--line)}
.clean-item{background:var(--surface); padding:14px 18px; display:flex; flex-wrap:wrap; gap:4px 14px; align-items:baseline}
.clean-item strong{font-family:Archivo,sans-serif; font-size:15px; color:var(--ink); font-weight:600}
.clean-item span{font-family:"IBM Plex Mono",monospace; font-size:12.5px; color:var(--muted)}
h3{font-family:Archivo,sans-serif; font-size:13px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); margin:0 0 14px; font-weight:700}

/* ---- footer ---- */
footer{border-top:1px solid var(--line); padding-top:22px; font-size:13.5px; color:var(--muted); display:flex; flex-direction:column; gap:10px}
footer p{margin:0; max-width:68ch}
footer .src{font-family:"IBM Plex Mono",monospace; font-size:12px; word-break:break-word}
@media (prefers-reduced-motion:reduce){*{animation:none!important; transition:none!important}}
@media print{body{background:#fff} .finding,.verdict,.tile{break-inside:avoid}}
`;

function severityTiles() {
  return SEVERITY_ORDER.filter((s) => c[s] > 0).map((s) => `
      <div class="tile" data-sev="${s}">
        <div class="tile-head"><span class="tile-n">${c[s]}</span><span class="tile-label">${SEVERITY[s].label}</span></div>
        <p class="tile-mean">${esc(SEVERITY[s].meaning)}</p>
      </div>`).join('');
}

function evidenceTable(f) {
  const shown = f.evidence.length;
  const caption = shown < f.count
    ? `Affected products — ${shown} of ${n(f.count)} shown`
    : `Affected products`;
  const rows = f.evidence.map((e) => {
    const links = (e.links ?? []).filter(Boolean);
    const label = links.length
      ? `<a href="${esc(links[0])}" target="_blank" rel="noopener">${esc(e.label)}</a>${
          links.length > 1 ? ` <span class="also">· <a href="${esc(links[1])}" target="_blank" rel="noopener">second page</a></span>` : ''}`
      : esc(e.label);
    return `<tr><td class="product">${label}</td><td class="detail">${esc(e.detail ?? '')}</td><td class="delta">${esc(e.delta ?? '')}</td></tr>`;
  }).join('\n            ');
  return `
        <p class="ev-head">${esc(caption)}</p>
        <div class="ev-scroll">
          <table>
            <thead><tr><th>Product</th><th>What the catalog says</th><th></th></tr></thead>
            <tbody>
            ${rows}
            </tbody>
          </table>
        </div>`;
}

function findingBlock(f, i) {
  return `
      <article class="finding" data-sev="${f.severity}">
        <div class="f-top">
          <span class="rank">${String(i + 1).padStart(2, '0')}</span>
          <span class="chip" data-sev="${f.severity}">${SEVERITY[f.severity].label}</span>
          <span class="count">${n(f.count)} ${esc(f.unit)}</span>
          <span class="means">${esc(SEVERITY[f.severity].meaning)}</span>
        </div>
        <h2>${esc(f.copy.title)}</h2>
        <p>${esc(f.copy.what)}</p>
        ${f.copy.why ? `<p>${esc(f.copy.why)}</p>` : ''}
        ${f.copy.do ? `<div class="todo"><strong>What to do</strong>${esc(f.copy.do)}</div>` : ''}
        ${f.evidence?.length ? evidenceTable(f) : ''}
      </article>`;
}

function bodyHtml() {
  return `<div class="wrap">
    <header class="masthead">
      <p class="eyebrow">Bells of Steel · Catalog health check</p>
      <h1>${total === 0 ? 'Your catalog is clean' : 'What your catalog is getting wrong today'}</h1>
      <p class="dateline">${esc(when(A.generated_at))} · ${n(A.scanned)} products · ${n(A.variants)} options</p>
    </header>

    <section class="verdict${total === 0 ? ' clean' : ''}">
      <p class="line">${esc(V.line)}</p>
      <p class="detail">${esc(V.detail)}</p>
    </section>

    ${total > 0 ? `<section class="tiles">${severityTiles()}
    </section>` : ''}

    ${total > 0 ? `<section class="findings">${F.map(findingBlock).join('')}
    </section>` : ''}

    ${A.clean?.length ? `<section>
      <h3>Checks that came back clean</h3>
      <div class="clean-list">
        ${A.clean.map((k) => `<div class="clean-item"><strong>${esc(k.label)}</strong><span>${esc(k.detail)}</span></div>`).join('\n        ')}
      </div>
    </section>` : ''}

    <footer>
      <p class="src">Source: ${esc(A.source)} · catalog read ${esc(whenExact(A.snapshot))} · report generated ${esc(whenExact(A.generated_at))}</p>
      <p>Every number here is counted from your published storefront catalog. Where the catalog does not publish something, this report says it is not published rather than estimating it.</p>
      <p>Independent catalog audit by Rana Thind. Not affiliated with, endorsed by, or an official property of Bells of Steel Inc.</p>
    </footer>
  </div>`;
}

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap">`;

const TITLE = 'Bells of Steel Catalog Health';

function fullHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE}</title>
${FONTS}
<style>${STYLE}</style>
</head>
<body>
${bodyHtml()}
</body>
</html>
`;
}

/** Artifact-ready: the publisher supplies the document skeleton, so this is head-level
 *  tags plus the body content and nothing else. */
function fragmentHtml() {
  return `<title>${TITLE}</title>
${FONTS}
<style>${STYLE}</style>
${bodyHtml()}
`;
}

/* --------------------------------------------------------------- output */

const write = (p, s) => { mkdirSync(dirname(p) || '.', { recursive: true }); writeFileSync(p, s); console.log(p); };
const md = arg('--md'), html = arg('--html'), frag = arg('--fragment');
if (!md && !html && !frag) { process.stdout.write(markdown()); }
if (md) write(md, markdown());
if (html) write(html, fullHtml());
if (frag) write(frag, fragmentHtml());
