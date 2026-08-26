// Catalogue monitor.
//
// Fingerprints the current catalogue, diffs it against the previous run, and
// records what actually changed. Designed to run unattended on a schedule -
// the value is not the snapshot, it is noticing the day something drifts.
//
// Writes:
//   data/snapshots/<iso>.json   compact fingerprint, one per run (~50 KB)
//   data/monitor.json           run history + diffs, read by the site
//   data/timeseries.csv         run_date,rule_id,count - BigQuery-shaped
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SNAP_DIR = 'data/snapshots';
mkdirSync(SNAP_DIR, { recursive: true });

const catalog = JSON.parse(readFileSync('data/catalog.json', 'utf8'));
const audit = JSON.parse(readFileSync('data/audit.json', 'utf8'));
const runAt = catalog.fetched_at;
const runDate = runAt.slice(0, 10);

/** Small enough to commit every day, complete enough to diff meaningfully. */
const fingerprint = {
  fetched_at: runAt,
  products: Object.fromEntries(catalog.products.map((p) => [p.id, {
    h: p.handle, t: p.title,
    p: p.priceMinCents, a: p.available ? 1 : 0,
    f: p.flags.slice().sort().join(','),
  }])),
  rules: Object.fromEntries(audit.findings.map((f) => [f.id, f.count])),
};

const prevFiles = readdirSync(SNAP_DIR).filter((f) => f.endsWith('.json')).sort();
const prevFile = prevFiles[prevFiles.length - 1];
const prev = prevFile ? JSON.parse(readFileSync(join(SNAP_DIR, prevFile), 'utf8')) : null;

const money = (c) => (c == null ? 'n/a' : `$${(c / 100).toFixed(2)}`);
const changes = [];

if (prev) {
  const cur = fingerprint.products, old = prev.products;
  const curIds = Object.keys(cur), oldIds = Object.keys(old);

  oldIds.filter((id) => !cur[id]).forEach((id) => changes.push({
    kind: 'removed', severity: 'info', title: old[id].t,
    detail: 'No longer present in the storefront feed.',
    handle: old[id].h,
  }));

  curIds.filter((id) => !old[id]).forEach((id) => changes.push({
    kind: 'added', severity: 'info', title: cur[id].t,
    detail: `New product in the feed at ${money(cur[id].p)}.`,
    handle: cur[id].h,
  }));

  curIds.filter((id) => old[id]).forEach((id) => {
    const a = old[id], b = cur[id];
    if (a.p !== b.p && a.p != null && b.p != null) {
      const delta = b.p - a.p;
      changes.push({
        kind: 'price', severity: Math.abs(delta) >= 5000 ? 'notable' : 'info',
        title: b.t, handle: b.h,
        detail: `${money(a.p)} → ${money(b.p)} (${delta > 0 ? '+' : ''}${money(Math.abs(delta)).replace('$', '$')}${delta > 0 ? '' : ' cheaper'})`,
      });
    }
    if (a.a !== b.a) changes.push({
      kind: 'stock', severity: 'info', title: b.t, handle: b.h,
      detail: b.a ? 'Back in stock.' : 'Went out of stock.',
    });
    if (a.f !== b.f) {
      const before = new Set(a.f ? a.f.split(',') : []);
      const after = new Set(b.f ? b.f.split(',') : []);
      const gained = [...after].filter((x) => !before.has(x));
      const fixed = [...before].filter((x) => !after.has(x));
      if (gained.length) changes.push({
        kind: 'regression', severity: 'alert', title: b.t, handle: b.h,
        detail: `New data issue: ${gained.join(', ')}.`,
      });
      if (fixed.length) changes.push({
        kind: 'fixed', severity: 'good', title: b.t, handle: b.h,
        detail: `Resolved: ${fixed.join(', ')}.`,
      });
    }
  });

  // Rule-level movement, which is what you would actually alert on.
  Object.entries(fingerprint.rules).forEach(([id, count]) => {
    const was = prev.rules?.[id];
    if (was != null && was !== count) changes.push({
      kind: 'rule', severity: count > was ? 'alert' : 'good',
      title: id, handle: null,
      detail: `Audit rule "${id}" moved ${was} → ${count}.`,
    });
  });
}

writeFileSync(join(SNAP_DIR, `${runAt.replace(/[:.]/g, '-')}.json`), JSON.stringify(fingerprint));

const history = existsSync('data/monitor.json')
  ? JSON.parse(readFileSync('data/monitor.json', 'utf8')).runs ?? []
  : [];

const run = {
  at: runAt,
  date: runDate,
  baseline: !prev,
  comparedTo: prev?.fetched_at ?? null,
  productCount: catalog.products.length,
  changeCount: changes.length,
  bySeverity: ['alert', 'notable', 'good', 'info'].reduce((acc, s) => {
    acc[s] = changes.filter((c) => c.severity === s).length; return acc;
  }, {}),
  changes: changes.slice(0, 60),
  rules: fingerprint.rules,
};

const runs = [run, ...history.filter((r) => r.at !== runAt)].slice(0, 30);
writeFileSync('data/monitor.json', JSON.stringify({ generated_at: new Date().toISOString(), runs }, null, 2));

// BigQuery-shaped time series: one row per rule per run.
const rows = ['run_date,rule_id,finding_count'];
runs.slice().reverse().forEach((r) =>
  Object.entries(r.rules ?? {}).forEach(([id, n]) => rows.push(`${r.date},${id},${n}`)));
writeFileSync('data/timeseries.csv', rows.join('\n') + '\n');

console.log(prev ? `monitor: compared against ${prev.fetched_at}` : 'monitor: first run, baseline established');
console.log(`  ${changes.length} change(s) · alert=${run.bySeverity.alert} notable=${run.bySeverity.notable} good=${run.bySeverity.good} info=${run.bySeverity.info}`);
changes.slice(0, 12).forEach((c) => console.log(`   [${c.severity}] ${c.kind}: ${c.title.slice(0, 54)} — ${c.detail.slice(0, 70)}`));
console.log(`  ${runs.length} run(s) in history → data/monitor.json, data/timeseries.csv`);
