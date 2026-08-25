import Link from 'next/link';
import { catalogStats, SNAPSHOT_DATE } from '@/lib/catalog';

const DEMOS = [
  {
    href: '/builder',
    n: '01',
    title: 'Gym Builder',
    blurb: 'Give it your ceiling height, floor space and budget. It returns racks that actually fit, drawn to scale, with every attachment their own compatibility tags say will bolt on.',
    tag: 'Customer-facing · Revenue',
    highlight: 'Runs on the hgb_ compatibility graph already in their catalog.',
  },
  {
    href: '/audit',
    n: '02',
    title: 'Catalog Audit',
    blurb: 'A merch-ops dashboard that reads the live storefront feed and lists what is broken in it. Not hypothetical problems — nine products are currently shipping a corrupted vendor field to customers.',
    tag: 'Internal · Merch ops',
    highlight: 'Real findings against the real catalog.',
  },
  {
    href: '/parts',
    n: '03',
    title: 'Parts Finder',
    blurb: 'Twenty-nine spare-parts products hide behind variant names like "Bolt M10x40". This turns them into a searchable index a support rep can use without knowing the SKU scheme.',
    tag: 'Internal · Support',
    highlight: 'Ticket deflection for warranty and replacement requests.',
  },
  {
    href: '/copilot',
    n: '04',
    title: 'CS Copilot',
    blurb: 'Answers customer questions from the catalog and shows exactly which products it pulled, what it is confident about, and when it should hand off to a human instead of guessing.',
    tag: 'Internal · AI with guardrails',
    highlight: 'Retrieval runs live. Nothing is invented.',
  },
];

export default function Home() {
  const s = catalogStats();
  const stats = [
    { k: s.products.toLocaleString(), v: 'products ingested' },
    { k: s.variants.toLocaleString(), v: 'variants' },
    { k: String(s.hgbTags), v: 'compatibility tags mapped' },
    { k: String(s.flagged), v: 'products with data issues' },
  ];

  return (
    <div className="gridbg">
      <section className="mx-auto max-w-6xl px-5 pt-20 pb-14">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-steel">
          Job application portfolio
        </p>
        <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          I built four internal tools on the
          <span className="text-steel"> real Bells of Steel catalog</span> instead of writing a cover letter.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          For the AI &amp; Internal Tools Developer role. Everything here reads from a snapshot of the
          live storefront feed — {s.products} products, {s.variants.toLocaleString()} variants — pulled on {SNAPSHOT_DATE}.
          No mock data, no lorem ipsum, no invented SKUs.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/builder" className="rounded bg-steel px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-[#ef5511]">
            Start with the Gym Builder
          </Link>
          <Link href="/build-log" className="rounded border border-line px-5 py-2.5 text-sm font-medium text-bright transition-colors hover:border-muted">
            How it was built
          </Link>
        </div>

        <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
          {stats.map((x) => (
            <div key={x.v} className="bg-panel px-5 py-6">
              <dt className="font-mono text-2xl font-semibold tabular-nums text-bright sm:text-3xl">{x.k}</dt>
              <dd className="mt-1.5 text-xs leading-snug text-muted">{x.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 md:grid-cols-2">
          {DEMOS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="group relative flex flex-col rounded-lg border border-line bg-panel p-6 transition-colors hover:border-steel/60"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-mono text-xs text-steel">{d.n}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{d.tag}</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight group-hover:text-steel transition-colors">
                {d.title}
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{d.blurb}</p>
              <p className="mt-4 border-t border-line pt-3 font-mono text-xs leading-relaxed text-bright/70">
                {d.highlight}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="rounded-lg border border-line bg-panel p-7">
          <h2 className="text-lg font-semibold tracking-tight">Why these four</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            The job description says you build internal applications, AI-powered tools, automations and
            dashboards for every department, and that you sit with the person who has the problem before
            you ship the fix. I could not sit with anyone at Bells of Steel, so I did the next best thing:
            I read the catalog feed closely enough to find the problems from the outside.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            The Gym Builder is the one a customer would touch. The other three are the unglamorous internal
            kind — the merch-ops dashboard, the support index, the copilot that knows when to shut up.
            That ratio is deliberate; it is roughly the ratio in the job description.
          </p>
        </div>
      </section>
    </div>
  );
}
