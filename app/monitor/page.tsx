import monitor from '@/data/monitor.json';
import Impact from '@/components/Impact';
import TechBox, { C } from '@/components/TechBox';
import { IconMonitor } from '@/components/Icons';
import audit from '@/data/audit.json';

export const metadata = { title: 'Catalogue Monitor — Rana Thind × Bells of Steel' };

const SEV: Record<string, { cls: string; dot: string; label: string }> = {
  alert:   { cls: 'border-red-500/35 bg-red-50', dot: 'bg-red-500', label: 'Alert' },
  notable: { cls: 'border-amber-500/40 bg-amber-50', dot: 'bg-amber-500', label: 'Notable' },
  good:    { cls: 'border-emerald-600/30 bg-emerald-50', dot: 'bg-emerald-600', label: 'Fixed' },
  info:    { cls: 'border-line bg-panel', dot: 'bg-lineStrong', label: 'Info' },
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' });

export default function Page() {
  const m = monitor as any;
  const runs = m.runs as any[];
  const latest = runs[0];
  const totalRules = Object.values(latest.rules ?? {}).reduce((s: number, n: any) => s + n, 0);

  return (
    <div className="gridbg">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-steel/25 bg-steelSoft text-steelDim">
            <IconMonitor className="h-6 w-6" />
          </span>
          <p className="eyebrow text-steelDim">Demo 03 · Internal · Automation</p>
        </div>
        <h1 className="mt-4 text-[clamp(32px,4.5vw,48px)] font-extrabold">Catalogue Monitor</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted">
          The Catalogue Audit says what is broken today. This is the part that stops it coming back.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          A scheduled job re-pulls your storefront feed every morning, fingerprints all{' '}
          {latest.productCount} products, and reports only what changed — new products, price movements,
          stock flips, data issues that appeared or got fixed.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          It runs unattended in GitHub Actions and commits each snapshot, so the history below is real
          rather than reconstructed.
        </p>

        <Impact
          points={[
            { lead: 'It catches drift the morning it happens.', body: <>An audit is stale a week later. This one re-reads the feed every day and only speaks up when something moved.</> },
            { lead: 'It has already earned its keep.', body: <>Its first real run found 21 changes in a single day, including two compare-at price problems your team had fixed and one product that quietly went out of stock.</> },
            { lead: 'It costs nobody any attention.', body: <>Runs unattended, commits its own history, and stays silent on the days nothing changed — which is most days, and is the point.</> },
          ]}
          caveat="It reports what changed, not whether the change was intended. A price drop and a pricing mistake look identical from outside."
        />

        <div className="mt-8 grid grid-cols-2 gap-6 border-t border-line pt-8 sm:grid-cols-4">
          <div>
            <p className="stat-num text-[36px] tabular-nums">{runs.length}</p>
            <p className="stat-lbl mt-1.5">runs recorded</p>
          </div>
          <div>
            <p className="stat-num text-[36px] tabular-nums">{latest.productCount}</p>
            <p className="stat-lbl mt-1.5">products watched</p>
          </div>
          <div>
            <p className="stat-num text-[36px] tabular-nums">{(audit as any).findings.length}</p>
            <p className="stat-lbl mt-1.5">rules evaluated</p>
          </div>
          <div>
            <p className="stat-num text-[36px] tabular-nums">{totalRules as number}</p>
            <p className="stat-lbl mt-1.5">findings across rules</p>
          </div>
        </div>

        {/* ---------- run history ---------- */}
        <h2 className="mt-14 text-2xl font-extrabold">Run history</h2>
        <div className="mt-5 space-y-3">
          {runs.map((r) => (
            <div key={r.at} className="rounded-lg border border-line bg-ink p-5 shadow-soft">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="font-bold">{fmt(r.at)}</p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {r.baseline
                      ? 'Baseline run — nothing to compare against yet.'
                      : `Compared against ${fmt(r.comparedTo)}`}
                  </p>
                </div>
                <span className={`rounded border px-2.5 py-1 text-[13px] font-semibold ${
                  r.changeCount === 0 ? 'border-line bg-panel text-muted' : 'border-steel/40 bg-steelSoft text-steelDim'
                }`}>
                  {r.changeCount} change{r.changeCount === 1 ? '' : 's'}
                </span>
              </div>

              {r.changeCount === 0 ? (
                <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-muted">
                  {r.baseline
                    ? 'First run. The fingerprint was recorded so later runs have something to diff against.'
                    : 'Nothing moved. This is the output on most days, and it is the point — a monitor that reports something every morning gets filtered into a folder nobody opens. Quiet is the correct answer when nothing changed.'}
                </p>
              ) : (
                <ul className="mt-4 space-y-2 border-t border-line pt-4">
                  {r.changes.map((c: any, i: number) => {
                    const sev = SEV[c.severity] ?? SEV.info;
                    return (
                      <li key={i} className={`flex flex-wrap items-baseline gap-2 rounded border px-3 py-2 ${sev.cls}`}>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${sev.dot}`} />
                        <span className="text-sm font-semibold">
                          {c.handle ? (
                            <a href={`https://bellsofsteel.com/products/${c.handle}`} target="_blank" rel="noopener noreferrer"
                               className="underline decoration-line underline-offset-2 hover:decoration-steel">
                              {c.title}
                            </a>
                          ) : c.title}
                        </span>
                        <span className="text-[13px] text-muted">{c.detail}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* ---------- what it watches ---------- */}
        <h2 className="mt-14 text-2xl font-extrabold">What it watches for</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ['Alert', 'A product gains a data issue it did not have before, or an audit rule count goes up. This is the case worth waking someone for — it means something regressed today.', 'alert'],
            ['Notable', 'A price moved by more than $50. Large enough that your support and marketing teams should know before a customer tells them.', 'notable'],
            ['Fixed', 'A data issue was resolved, or a rule count went down. Worth recording so the work shows.', 'good'],
            ['Info', 'Products added or removed, stock flips, small price changes. Logged, never alerted on.', 'info'],
          ].map(([label, desc, sev]) => (
            <div key={label as string} className={`rounded-lg border p-4 ${SEV[sev as string].cls}`}>
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${SEV[sev as string].dot}`} />
                <p className="font-bold">{label}</p>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{desc}</p>
            </div>
          ))}
        </div>

        {/* ---------- the schedule ---------- */}
        <h2 className="mt-14 text-2xl font-extrabold">How it runs</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          A daily cron that re-runs the pipeline, writes a snapshot and commits it. Two polite requests to
          your storefront per day, 600ms apart, with a User-Agent that says who it is. Inside your stack the
          last step posts to Slack rather than writing a file.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-panel p-4 font-mono text-[12px] leading-relaxed text-dim">
{`# .github/workflows/catalog-monitor.yml
on:
  schedule:
    - cron: '0 13 * * *'   # 07:00 Calgary, every day
  workflow_dispatch:        # and on demand

jobs:
  monitor:
    steps:
      - run: npm run refresh-catalog
      - run: git commit -am "Catalog snapshot $(date -I)"
      - if: steps.monitor.outputs.alerts != '0'
        run: curl -X POST "$SLACK_WEBHOOK" -d @alert.json`}
        </pre>

        {/* ---------- bigquery ---------- */}
        <h2 className="mt-14 text-2xl font-extrabold">Where this lands in BigQuery</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          Every run also appends to a flat time series — one row per rule per day. That is the shape you
          want in BigQuery: narrow, append-only, and chartable in Looker without any further modelling.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="stat-lbl">Table</p>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-panel p-4 font-mono text-[12px] leading-relaxed text-dim">
{`CREATE TABLE catalog_health (
  run_date      DATE    NOT NULL,
  rule_id       STRING  NOT NULL,
  finding_count INT64   NOT NULL
)
PARTITION BY run_date
CLUSTER BY rule_id;`}
            </pre>
          </div>
          <div>
            <p className="stat-lbl">Query behind the chart</p>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-panel p-4 font-mono text-[12px] leading-relaxed text-dim">
{`SELECT
  run_date,
  rule_id,
  finding_count,
  finding_count - LAG(finding_count)
    OVER (PARTITION BY rule_id
          ORDER BY run_date) AS delta
FROM catalog_health
WHERE run_date >= CURRENT_DATE() - 30
ORDER BY run_date DESC, finding_count DESC;`}
            </pre>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-line bg-panel p-5">
          <p className="stat-lbl">Current contents of data/timeseries.csv</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[380px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="stat-lbl">
                  <th className="pb-2 pr-4 font-semibold">run_date</th>
                  <th className="pb-2 pr-4 font-semibold">rule_id</th>
                  <th className="pb-2 text-right font-semibold">finding_count</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {runs.slice().reverse().flatMap((r: any) =>
                  Object.entries(r.rules ?? {}).map(([id, n]) => (
                    <tr key={`${r.date}-${id}`} className="border-t border-line">
                      <td className="py-1.5 pr-4 text-muted">{r.date}</td>
                      <td className="py-1.5 pr-4">{id}</td>
                      <td className="py-1.5 text-right tabular-nums">{n as number}</td>
                    </tr>
                  ))
                ).slice(0, 14)}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px] text-muted">
            Showing the first rows. The file grows by {(audit as any).findings.length} rows per day.
          </p>
        </div>
        <TechBox
          rows={[
                  { k: 'Schedule', v: <>GitHub Actions cron at 07:00 Calgary. Unattended — no machine of mine needs to be on.</> },
          { k: 'Diffing', v: <>Each run fingerprints all 476 products, compares against the previous run, and classifies what moved by severity.</> },
          { k: 'State', v: <>Append-only snapshots in <C>data/snapshots/</C>, committed back by the job itself.</> },
          { k: 'Warehouse', v: <><C>data/timeseries.csv</C> — one row per rule per day, the shape BigQuery wants.</> },
          ]}
          note="The job commits under its own name, so the run history is auditable rather than asserted."
        />
      </div>
    </div>
  );
}
