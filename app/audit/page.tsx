import audit from '@/data/audit.json';
import Impact from '@/components/Impact';
import TechBox, { C } from '@/components/TechBox';
import { IconAudit } from '@/components/Icons';
import { SNAPSHOT_DATE } from '@/lib/catalog';

export const metadata = { title: 'Catalogue Audit · Rana Thind × Bells of Steel' };

type Sev = 'critical' | 'high' | 'medium' | 'low';

const SEV: Record<Sev, { label: string; cls: string; bar: string }> = {
  critical: { label: 'Critical', cls: 'text-red-700 border-red-500/40 bg-red-50', bar: 'bg-red-500' },
  high:     { label: 'High',     cls: 'text-orange-700 border-orange-500/40 bg-orange-50', bar: 'bg-orange-500' },
  medium:   { label: 'Medium',   cls: 'text-amber-800 border-amber-400/40 bg-amber-50', bar: 'bg-amber-500' },
  low:      { label: 'Low',      cls: 'text-muted border-line bg-panel', bar: 'bg-muted' },
};

export default function Page() {
  const { findings, clean, scanned, variants } = audit as any;
  const bySev = (s: Sev) => findings.filter((f: any) => f.severity === s).length;

  return (
    <div className="gridbg">
      <div className="mx-auto max-w-5xl px-5 py-12">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-steel/25 bg-steelSoft text-steelDim">
            <IconAudit className="h-6 w-6" />
          </span>
          <p className="eyebrow text-steelDim">Demo 02 · Internal · Merch ops</p>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Catalogue Audit</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted">
          A dashboard that reads your storefront feed and reports what is wrong with it. Every finding below
          is against your live catalogue as of {SNAPSHOT_DATE}, {scanned} products,{' '}
          {variants.toLocaleString()} variants. Nothing here is hypothetical.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          This is the least glamorous thing I built and the one I would want to ship first. It is the kind
          of thing that runs nightly and posts to a channel, so nobody has to remember to go looking.
        </p>

        <Impact
          points={[
            { lead: 'It asks the same questions of all 476 products.', body: <>Roughly 6,000 checks in a few seconds. Nobody looks at product 300 as carefully as product 3, and this does not get tired.</> },
            { lead: 'Ranked by what it costs, not by how hard it is to fix.', body: <>Freight items with no weight leak money on every order; two products missing photos is housekeeping. The list is meant to be acted on top-down.</> },
            { lead: 'Every finding links to the evidence.', body: <>Each one is checkable in a click, so a finding you disagree with can be dismissed in seconds rather than argued about.</> },
          ]}
          caveat="It reads your public storefront feed only, no ERP, no inventory, no orders, and it cannot know intent. A finding is a question worth asking, not a verdict."
        />
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
          {(['critical', 'high', 'medium', 'low'] as Sev[]).map((s) => (
            <div key={s} className="bg-panel px-4 py-4">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${SEV[s].bar}`} />
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{SEV[s].label}</span>
              </div>
              <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums">{bySev(s)}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {findings.map((f: any) => {
            const sev = SEV[f.severity as Sev];
            return (
              <details key={f.id} className="group rounded-lg border border-line bg-panel" open={f.severity === 'critical'}>
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-5">
                  <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${sev.cls}`}>
                    {sev.label}
                  </span>
                  <span className="font-mono text-lg font-semibold tabular-nums">{f.count}</span>
                  <span className="font-mono text-[10px] text-muted">{f.unit}</span>
                  <span className="w-full text-base font-medium leading-snug sm:w-auto sm:flex-1">{f.title}</span>
                  <span className="font-mono text-xs text-muted transition-transform group-open:rotate-90">›</span>
                </summary>

                <div className="space-y-4 border-t border-line px-5 py-5">
                  <p className="text-sm leading-relaxed text-dim">{f.summary}</p>

                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-steel">Why it matters</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.impact}</p>
                  </div>

                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-steel">What I&rsquo;d do</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.fix}</p>
                  </div>

                  {f.verified && (
                    <p className="rounded border border-emerald-600/30 bg-emerald-50 p-3 font-mono text-[11px] leading-relaxed text-emerald-800">
                      ✓ {f.verified}
                    </p>
                  )}

                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                      Evidence · showing {f.evidence.length} of {f.count}
                    </p>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[520px] border-collapse text-left">
                        <tbody>
                          {f.evidence.map((e: any, i: number) => (
                            <tr key={i} className="border-t border-line/70 align-top">
                              <td className="py-2 pr-4 text-xs">
                                <a href={e.links[0]} target="_blank" rel="noopener noreferrer"
                                   className="text-bright underline decoration-line underline-offset-2 hover:decoration-steel">
                                  {e.label}
                                </a>
                                {e.links[1] && (
                                  <>
                                    {' '}
                                    <a href={e.links[1]} target="_blank" rel="noopener noreferrer"
                                       className="text-muted underline decoration-line underline-offset-2 hover:text-bright">
                                      (second listing)
                                    </a>
                                  </>
                                )}
                              </td>
                              <td className="py-2 pr-4 font-mono text-[11px] text-muted">{e.detail}</td>
                              <td className="py-2 text-right font-mono text-[11px] text-amber-800">{e.delta}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </div>

        <div className="mt-8 rounded-lg border border-line bg-panel p-5">
          <h2 className="text-sm font-semibold">Checks that came back clean</h2>
          <p className="mt-1 text-xs text-muted">An audit that only ever finds problems is not an audit.</p>
          <ul className="mt-3 space-y-2">
            {clean.map((c: any) => (
              <li key={c.label} className="flex gap-2.5 text-xs leading-relaxed">
                <span className="mt-[3px] text-emerald-700">✓</span>
                <span><span className="text-bright">{c.label}.</span> <span className="text-muted">{c.detail}</span></span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted">
          Findings are computed by <code className="text-bright">scripts/audit.mjs</code> at build time from your
          raw storefront feed. Counts and prices reflect the {SNAPSHOT_DATE} snapshot and may have changed since, 
          if any of these are already fixed, the Catalogue Monitor would have caught it.
        </p>
        <TechBox
          rows={[
                  { k: 'Rules', v: <><C>scripts/audit.mjs</C>, 13 checks run at build time against the raw storefront feed, not a cleaned copy.</> },
          { k: 'Output', v: <><C>data/audit.json</C>, rendered server-side. Nothing is computed while you read this page.</> },
          { k: 'Verification', v: <>Findings that assert something live are checked by fetching the URL, and comparisons are restricted to like-for-like listings.</> },
          { k: 'Also shipped as', v: <>A skill in <C>.claude/skills/catalog-audit</C>, so someone who cannot read JavaScript can run the same checks.</> },
          ]}
          note="Built with Claude Code. The skill version was built in Cowork."
        />
      </div>
    </div>
  );
}
