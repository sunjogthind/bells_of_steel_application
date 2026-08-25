import { builderPayload } from '@/lib/builder-data';
import { SNAPSHOT_DATE } from '@/lib/catalog';
import Builder from './Builder';

export const metadata = { title: 'Gym Builder — Rana Thind × Bells of Steel' };

export default function Page() {
  const { racks, kit, lookup } = builderPayload();
  return (
    <div className="gridbg">
      <div className="mx-auto max-w-6xl px-5 pt-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-steel">Demo 01 · Customer-facing</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Gym Builder</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted">
          &ldquo;Will it fit in my basement?&rdquo; is the question that decides whether someone buys a rack
          or closes the tab. This answers it against the {racks.length} prebuilt rack models in the live
          catalog, then shows only the attachments Bells of Steel&rsquo;s own compatibility tags say will
          bolt onto the one you picked.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Every dimension is labelled with where it came from — the product page, our estimate, or
          <span className="text-red-400"> not published at all</span>. When Bells of Steel doesn&rsquo;t
          publish a number, the tool says so instead of guessing. Snapshot: {SNAPSHOT_DATE}.
        </p>
      </div>
      <Builder racks={racks} kit={kit} lookup={lookup} />
    </div>
  );
}
