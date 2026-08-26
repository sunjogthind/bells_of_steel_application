import copilot from '@/data/copilot.json';
import { IconCopilot } from '@/components/Icons';
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
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-steel/25 bg-steelSoft text-steelDim">
            <IconCopilot className="h-6 w-6" />
          </span>
          <p className="eyebrow text-steelDim">Demo 04 · Internal · AI with guardrails</p>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">CS Copilot</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted">
          Drafts a reply to a customer question, shows exactly which products it pulled to get there, and
          refuses when your catalog cannot support an answer. Running against all {d.docs.length} of your
          products and {d.parts.length} spare parts, snapshot {SNAPSHOT_DATE}.
        </p>

        <div className="mt-6 max-w-3xl rounded-lg border border-line bg-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-steel">A deliberate choice</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            No language model here. Every fact is a lookup against your catalog, carrying the URL it came
            from, and anything your catalog cannot support goes to a human.
          </p>
          <p className="mt-2.5 text-sm leading-relaxed text-muted">
            A model would write warmer prose. It would not change which facts the answer may contain — that
            is settled by the retrieval and escalation layer underneath. Spotter runs the same engine with
            Claude wired in.
          </p>
        </div>

        <div className="mt-8">
          <Copilot ix={ix} tickets={d.tickets} />
        </div>

        <div className="mt-16 border-t border-line pt-12">
          <p className="eyebrow text-steelDim">The lookup layer underneath</p>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">Parts index</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted">
            You sell {pd.partCount} spare parts, buried as variants inside {pd.productCount} parent products
            with names like &ldquo;FID Bench Spare Parts&rdquo;. A customer with a torn bench pad cannot find
            one, and neither can a rep in their first week.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            Flattened into one searchable index. Matching is deterministic — it ranks results, it cannot
            invent a part number.
          </p>

          <div className="mt-6">
            <PartsIndex parts={pd.parts} symptoms={pd.symptoms} skuGrammar={pd.skuGrammar} />
          </div>
        </div>
      </div>
    </div>
  );
}
