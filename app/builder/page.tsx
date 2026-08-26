import { builderPayload } from '@/lib/builder-data';
import TechBox, { C } from '@/components/TechBox';
import { IconRack } from '@/components/Icons';
import { SNAPSHOT_DATE } from '@/lib/catalog';
import Builder from './Builder';

export const metadata = { title: 'Gym Builder — Rana Thind × Bells of Steel' };

export default function Page() {
  const { racks, kit, lookup } = builderPayload();
  return (
    <div className="gridbg">
      <div className="mx-auto max-w-6xl px-5 pt-12">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-steel/25 bg-steelSoft text-steelDim">
            <IconRack className="h-6 w-6" />
          </span>
          <p className="eyebrow text-steelDim">Demo 01 · Customer-facing</p>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Gym Builder</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted">
          &ldquo;Will it fit in my basement?&rdquo; decides whether someone buys a rack or closes the tab.
          This answers it against the {racks.length} prebuilt rack models in your live catalogue, then shows
          only the attachments your own compatibility tags say will bolt on.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Every dimension is labelled with where it came from — the product page, my estimate, or
          <span className="text-red-600"> not published at all</span>. Where a spec isn&rsquo;t published,
          the tool says so instead of guessing. Snapshot: {SNAPSHOT_DATE}.
        </p>
      </div>
      <Builder racks={racks} kit={kit} lookup={lookup} />
      <div className="mx-auto max-w-6xl px-5">
        <TechBox
          rows={[
                  { k: 'Rendering', v: <>Next.js server component reads the catalogue, trims it, and passes only what the client needs. The 4.4&nbsp;MB feed never reaches the browser.</> },
          { k: 'Fit engine', v: <><C>lib/fit.ts</C> — pure functions, no I/O. Every dimension carries a provenance tag: sourced, estimated, or not published.</> },
          { k: 'Drawing', v: <>Hand-written inline SVG. Plan and elevation share one inch-to-pixel scale, so the two views agree.</> },
          { k: 'Compatibility', v: <>Traverses the <C>hgb_</C> tag graph across five attachment classes rather than inferring fit.</> },
          ]}
          note="No API calls and no runtime services. The page is static and cannot fail in front of anyone."
        />
      </div>
    </div>
  );
}
