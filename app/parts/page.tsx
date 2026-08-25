import parts from '@/data/parts.json';
import { SNAPSHOT_DATE } from '@/lib/catalog';
import PartsSearch from './PartsSearch';

export const metadata = { title: 'Parts Finder — Rana Thind × Bells of Steel' };

export default function Page() {
  const d = parts as any;
  return (
    <div className="gridbg">
      <div className="mx-auto max-w-5xl px-5 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-steel">Demo 03 · Internal · Support</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Parts Finder</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted">
          Bells of Steel sells {d.partCount} individual spare parts, but they are buried as variants inside{' '}
          {d.productCount} parent products with names like &ldquo;FID Bench Spare Parts&rdquo;. A customer
          writing in about a torn bench pad has no way to find one, and neither does a new support rep.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          This flattens all of them into one index you can search in plain language. Matching is
          deterministic — a scored search over the real catalog, no model in the loop — so it can rank
          results but it cannot invent a part number that does not exist. Snapshot: {SNAPSHOT_DATE}.
        </p>

        <div className="mt-8">
          <PartsSearch parts={d.parts} symptoms={d.symptoms} uncovered={d.uncovered} skuGrammar={d.skuGrammar} />
        </div>
      </div>
    </div>
  );
}
