'use client';

import { useMemo, useState } from 'react';
import { answer, type Index, type Answer } from '@/lib/copilot';

const CONF: Record<Answer['confidence'], { label: string; cls: string }> = {
  high:   { label: 'Grounded', cls: 'text-emerald-700 border-emerald-600/35 bg-emerald-50' },
  medium: { label: 'Check first', cls: 'text-amber-800 border-amber-500/40 bg-amber-50' },
  none:   { label: 'Escalate', cls: 'text-red-700 border-red-500/40 bg-red-50' },
};

export default function Copilot({ ix, tickets }: { ix: Index; tickets: { q: string; why: string }[] }) {
  const [q, setQ] = useState(tickets[0].q);
  const [submitted, setSubmitted] = useState(tickets[0].q);

  const result = useMemo(() => (submitted.trim() ? answer(submitted, ix) : null), [submitted, ix]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-panel p-5">
        <form
          onSubmit={(e) => { e.preventDefault(); setSubmitted(q); }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <textarea
            value={q} onChange={(e) => setQ(e.target.value)}
            rows={2}
            aria-label="Customer question"
            placeholder="Paste a customer question…"
            className="flex-1 resize-none rounded border border-line bg-ink px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-steel"
          />
          <button type="submit"
                  className="h-fit rounded bg-steel px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-steelDim">
            Draft reply
          </button>
        </form>

        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Example tickets</p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {tickets.map((t) => (
              <button key={t.q}
                      onClick={() => { setQ(t.q); setSubmitted(t.q); }}
                      className={`rounded border p-2.5 text-left transition-colors ${
                        submitted === t.q ? 'border-steel bg-steelSoft' : 'border-line hover:border-muted'
                      }`}>
                <p className="text-xs leading-snug">{t.q}</p>
                <p className="mt-1 font-mono text-[10px] text-muted">{t.why}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {result && (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <div className={`rounded-lg border p-5 ${result.escalate ? 'border-red-500/35 bg-red-50' : 'border-line bg-panel'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${CONF[result.confidence].cls}`}>
                  {CONF[result.confidence].label}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                  intent: {result.intent}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-semibold leading-snug tracking-tight">{result.headline}</h2>
              <div className="mt-3 space-y-2.5">
                {result.body.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted">{p}</p>
                ))}
              </div>
            </div>

            {result.citations.length > 0 && (
              <div className="rounded-lg border border-line bg-panel p-5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
                  Sources · every claim above traces to one of these
                </p>
                <ul className="mt-3 space-y-2">
                  {result.citations.map((c, i) => (
                    <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/60 pb-2 last:border-0">
                      <a href={c.url} target="_blank" rel="noopener noreferrer"
                         className="text-xs underline decoration-line underline-offset-2 hover:decoration-steel">
                        {c.title}
                      </a>
                      <span className="font-mono text-[10px] text-muted">{c.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-line bg-ink p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Decision trace</p>
            <ol className="mt-3 space-y-2">
              {result.trace.map((t, i) => (
                <li key={i} className="flex gap-2 font-mono text-[11px] leading-relaxed text-muted">
                  <span className="text-steel">{String(i + 1).padStart(2, '0')}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
            {result.escalate && (
              <p className="mt-4 rounded border border-red-500/30 bg-red-50 p-2.5 font-mono text-[10px] leading-relaxed text-red-800">
                → handed to a human. No answer sent.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
