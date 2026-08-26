import copilot from '@/data/copilot.json';
import parts from '@/data/parts.json';
import { SNAPSHOT_DATE } from '@/lib/catalog';
import Copilot from './Copilot';
import PartsIndex from './PartsIndex';
import type { Index } from '@/lib/copilot';

export const metadata = { title: 'CS Copilot — Rana Thind × Bells of Steel' };

export default function Page() {
  const d = copilot as any;
  const pd = parts as any;
  const ix: Index = { docs: d.docs, idf: d.idf, parts: d.parts, dupPrices: d.dupPrices };

  return (
    <div className="gridbg">
      <div className="mx-auto max-w-5xl px-5 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-steel">Demo 04 · Internal · AI with guardrails</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">CS Copilot</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted">
          Drafts a reply to a customer question, shows exactly which products it pulled to get there, and
          refuses when your catalog cannot support an answer. Running against all {d.docs.length} of your
          products and {d.parts.length} spare parts, snapshot {SNAPSHOT_DATE}.
        </p>

        <div className="mt-6 max-w-3xl rounded-lg border border-line bg-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-steel">A deliberate choice</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            There is no language model behind this. Every fact in every answer is a lookup against your
            catalog, carrying the URL it came from, and anything your catalog cannot support is routed to a
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

        <div className="mt-16 border-t border-line pt-12">
          <p className="eyebrow text-steelDim">The lookup layer underneath</p>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">Parts index</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted">
            When the copilot answers a parts question it searches this. You sell {pd.partCount} individual
            spare parts, but they are buried as variants inside {pd.productCount} parent products with names
            like &ldquo;FID Bench Spare Parts&rdquo; — a customer writing in about a torn bench pad cannot
            find one, and neither can a support rep in their first week.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            Flattened into one index, searchable in plain language, and browsable directly for the times a rep
            would rather look than ask. Matching is deterministic, so it can rank results but cannot invent a
            part number that does not exist.
          </p>

          <div className="mt-6">
            <PartsIndex parts={pd.parts} symptoms={pd.symptoms} skuGrammar={pd.skuGrammar} />
          </div>
        </div>
      </div>
    </div>
  );
}
