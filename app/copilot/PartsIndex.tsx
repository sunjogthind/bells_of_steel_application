'use client';

import { useMemo, useState } from 'react';

type Part = {
  id: string; name: string; ref: string | null; sku: string | null;
  priceCents: number; available: boolean; machine: string; parentTitle: string; url: string;
};
type Symptom = { say: string; match: string[] };

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Deterministic scoring - no model in the loop, so it cannot invent a part number. */
function score(part: Part, q: string, expanded: string[]) {
  const nq = norm(q);
  if (!nq) return 0;
  const name = norm(part.name), machine = norm(part.machine), sku = (part.sku ?? '').toLowerCase();
  let s = 0;
  if (sku && sku === nq.replace(/ /g, '-')) s += 100;
  if (sku && sku.includes(nq.replace(/ /g, '-'))) s += 40;
  if (name === nq) s += 60;
  if (name.includes(nq)) s += 30;
  if (machine.includes(nq)) s += 22;
  nq.split(' ').forEach((tok) => {
    if (tok.length < 3) return;
    if (name.includes(tok)) s += 10;
    if (machine.includes(tok)) s += 6;
  });
  expanded.forEach((tok) => { if (name.includes(tok)) s += 14; });
  return s;
}

export default function PartsIndex({
  parts, symptoms, skuGrammar,
}: {
  parts: Part[]; symptoms: Symptom[];
  skuGrammar: { total: number; prefixed: number; topMachineCodes: [string, number][] };
}) {
  const [q, setQ] = useState('');
  const [machine, setMachine] = useState<string>('all');

  const machines = useMemo(
    () => Array.from(new Set(parts.map((p) => p.machine))).sort(),
    [parts]
  );

  const expanded = useMemo(() => {
    const nq = norm(q);
    const hit = symptoms.find((s) => nq && (norm(s.say).includes(nq) || s.match.some((m) => nq.includes(m))));
    return hit ? hit.match : [];
  }, [q, symptoms]);

  const results = useMemo(() => {
    const pool = machine === 'all' ? parts : parts.filter((p) => p.machine === machine);
    if (!q.trim()) return pool.slice(0, 40).map((p) => ({ p, s: 0 }));
    return pool
      .map((p) => ({ p, s: score(p, q, expanded) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || a.p.priceCents - b.p.priceCents)
      .slice(0, 40);
  }, [parts, q, machine, expanded]);

  const empty = q.trim().length > 0 && results.length === 0;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Describe the broken part, or paste a SKU…"
            aria-label="Search spare parts"
            className="flex-1 rounded border border-line bg-ink px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-steel"
          />
          <select
            value={machine} onChange={(e) => setMachine(e.target.value)}
            aria-label="Filter by machine"
            className="rounded border border-line bg-ink px-3 py-2.5 text-sm outline-none focus:border-steel"
          >
            <option value="all">All machines ({machines.length})</option>
            {machines.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Try</span>
          {symptoms.map((s) => (
            <button key={s.say} onClick={() => setQ(s.say)}
                    className="rounded border border-line px-2 py-1 text-[11px] text-muted transition-colors hover:border-steel hover:text-steel">
              &ldquo;{s.say}&rdquo;
            </button>
          ))}
        </div>

        {expanded.length > 0 && (
          <p className="mt-3 rounded border border-steel/40 bg-steelSoft px-3 py-2 font-mono text-[11px] text-steel">
            matched symptom → searching part vocabulary: {expanded.join(', ')}
          </p>
        )}
      </div>

      {empty ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-900">No part matches that.</p>
          <p className="mt-2 text-sm leading-relaxed text-amber-900">
            This is the honest answer, not a nearest-guess. You publish {parts.length} spare parts across{' '}
            {machines.length} machines; anything outside that list has to go to a human, because sending a
            customer the wrong replacement part costs more than saying &ldquo;let me check&rdquo;.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-panel font-mono text-[10px] uppercase tracking-wider text-muted">
                <th className="px-4 py-2.5 font-normal">Part</th>
                <th className="px-4 py-2.5 font-normal">Machine</th>
                <th className="px-4 py-2.5 font-normal">SKU</th>
                <th className="px-4 py-2.5 text-right font-normal">Price</th>
              </tr>
            </thead>
            <tbody>
              {results.map(({ p }) => (
                <tr key={p.id} className="border-t border-line bg-ink transition-colors hover:bg-panel">
                  <td className="px-4 py-2.5">
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                       className="underline decoration-line underline-offset-2 hover:decoration-steel">
                      {p.name}
                    </a>
                    {p.ref && <span className="ml-1.5 font-mono text-[10px] text-muted">diagram #{p.ref}</span>}
                    {!p.available && <span className="ml-1.5 font-mono text-[10px] text-red-600">out of stock</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">{p.machine}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-muted">{p.sku ?? ', '}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{money(p.priceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-sm font-semibold">The SKU convention, written down</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            All {skuGrammar.prefixed} of {skuGrammar.total} of your part SKUs follow{' '}
            <code className="text-steel">SP-&lt;MACHINE&gt;-&lt;PART&gt;</code>. The convention is perfectly
            consistent. It is just written down nowhere a new support rep would find it.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skuGrammar.topMachineCodes.map(([code, n]) => (
              <span key={code} className="rounded border border-line px-2 py-1 font-mono text-[10px] text-muted">
                {code} <span className="text-bright">×{n}</span>
              </span>
            ))}
          </div>
      </div>
    </div>
  );
}
