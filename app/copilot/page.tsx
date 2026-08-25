import copilot from '@/data/copilot.json';
import { SNAPSHOT_DATE } from '@/lib/catalog';
import Copilot from './Copilot';
import type { Index } from '@/lib/copilot';

export const metadata = { title: 'CS Copilot — Rana Thind × Bells of Steel' };

export default function Page() {
  const d = copilot as any;
  const ix: Index = { docs: d.docs, idf: d.idf, parts: d.parts, dupPrices: d.dupPrices };

  return (
    <div className="gridbg">
      <div className="mx-auto max-w-5xl px-5 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-steel">Demo 04 · Internal · AI with guardrails</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">CS Copilot</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted">
          Drafts a reply to a customer question, shows exactly which products it pulled to get there, and
          refuses when the catalog cannot support an answer. Running against all {d.docs.length} products
          and {d.parts.length} spare parts, snapshot {SNAPSHOT_DATE}.
        </p>

        <div className="mt-6 max-w-3xl rounded-lg border border-line bg-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-steel">A deliberate choice</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            There is no language model behind this. Every fact in every answer is a lookup against the
            catalog, carrying the URL it came from, and anything the catalog cannot support is routed to a
            human instead of approximated. That makes the demo free to run and impossible to hallucinate at.
          </p>
          <p className="mt-2.5 text-sm leading-relaxed text-muted">
            Putting Claude on top of this is a short API route, and it would write nicer prose. It would not
            change which facts the answer is allowed to contain — that is decided by the retrieval and
            escalation layer underneath, which is the part worth showing. It is the same pattern I used in
            FinanceOS: let the model write, never let it be the source of truth.
          </p>
        </div>

        <div className="mt-8">
          <Copilot ix={ix} tickets={d.tickets} />
        </div>
      </div>
    </div>
  );
}
