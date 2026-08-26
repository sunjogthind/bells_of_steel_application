import Link from 'next/link';
import { catalogStats, SNAPSHOT_DATE } from '@/lib/catalog';

const DEMOS = ([
  {
    href: '/builder',
    n: '01',
    title: 'Gym Builder',
    blurb: 'Give it your ceiling height, floor space and budget. It returns racks that actually fit, drawn to scale, with every attachment your own compatibility tags say will bolt on.',
    tag: 'Customer-facing · Revenue',
    highlight: 'Runs on the hgb_ compatibility graph already in your catalog.',
  },
  {
    href: '/audit',
    n: '02',
    title: 'Catalog Audit',
    blurb: 'A dashboard that reads your live storefront feed and lists what is broken in it. Not hypothetical problems — nine of your products are shipping a corrupted vendor field to customers right now.',
    tag: 'Internal · Merch ops',
    highlight: 'Real findings against your real catalog.',
  },
  {
    href: '/monitor',
    n: '03',
    title: 'Catalog Monitor',
    blurb: 'The audit says what is broken today. This is what stops it coming back — a scheduled job that re-pulls your feed every morning, diffs it against yesterday, and reports only what actually moved.',
    tag: 'Internal · Automation',
    highlight: 'Runs unattended in GitHub Actions. The history is real, not seeded.',
  },
  {
    href: '/spotter',
    n: '05',
    title: 'Spotter',
    blurb: 'A coach that reads the signup profile a new member types in plain language and writes a program around the equipment they already own. Retrieval-grounded, and it refuses to train around an injury.',
    tag: 'Product concept · RAG',
    highlight: 'Your Program Quiz, after it learns to listen.',
  },
  {
    href: '/copilot',
    n: '04',
    title: 'CS Copilot',
    blurb: 'Answers customer questions from your catalog, shows exactly which products it pulled, and hands off to a human rather than guessing. Sits on a flattened index of all 68 of your spare parts, searchable in plain language.',
    tag: 'Internal · AI with guardrails',
    highlight: 'Retrieval runs live. Nothing is invented.',
  },
] as const).slice().sort((a, b) => a.n.localeCompare(b.n));

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
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-20">
        <p className="eyebrow text-steelDim">Job application portfolio</p>

        <h1 className="mt-5 max-w-4xl text-[clamp(40px,6vw,72px)] font-extrabold">
          I built five internal tools on your{' '}
          <em className="not-italic text-steelDim">real catalog</em>{' '}
          instead of writing a cover letter.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          For the AI &amp; Internal Tools Developer role. Everything here reads from a snapshot of your
          live storefront feed — {s.products} products, {s.variants.toLocaleString()} variants — pulled on {SNAPSHOT_DATE}.
          No mock data, no lorem ipsum, no invented SKUs.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/builder"
                className="rounded bg-steel px-6 py-3 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-px hover:bg-steelDim hover:shadow-glowLg">
            Start with the Gym Builder
          </Link>
          <Link href="/build-log"
                className="rounded border border-lineStrong px-6 py-3 text-[15px] font-bold text-bright transition-colors hover:border-steelDim hover:text-steelDim">
            How it was built
          </Link>
          <a href="https://github.com/sunjogthind/bells_of_steel_application" target="_blank" rel="noopener noreferrer"
             className="rounded border border-line px-6 py-3 text-[15px] font-semibold text-dim transition-colors hover:border-steelDim hover:text-steelDim">
            Source ↗
          </a>
        </div>

        <dl className="mt-14 grid grid-cols-2 gap-6 border-t border-line pt-8 sm:grid-cols-4">
          {stats.map((x) => (
            <div key={x.v}>
              <dt className="stat-num text-[36px] tabular-nums">{x.k}</dt>
              <dd className="stat-lbl mt-1.5">{x.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 pb-20">
        <div className="grid gap-5 md:grid-cols-2">
          {DEMOS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="group relative flex flex-col rounded-lg border border-line bg-ink p-7 shadow-soft transition-all hover:-translate-y-0.5 hover:border-steel/60 hover:shadow-strong"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-extrabold text-steelDim">{d.n}</span>
                <span className="stat-lbl text-[11px]">{d.tag}</span>
              </div>
              <h2 className="mt-3 text-2xl font-extrabold transition-colors group-hover:text-steelDim">
                {d.title}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{d.blurb}</p>
              <p className="mt-5 border-t border-line pt-4 text-sm font-semibold leading-relaxed text-steelDim">
                {d.highlight}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 pb-24">
        <div className="rounded-lg border border-line bg-panel p-8">
          <h2 className="text-2xl font-extrabold">Why these five</h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-muted">
            The job description says this role builds internal applications, AI-powered tools, automations
            and dashboards for every department, and that you sit with the person who has the problem before
            you ship the fix. I could not sit with anyone at Bells of Steel before applying, so I did the
            next best thing: I read your catalog feed closely enough to find the problems from the outside.
          </p>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-muted">
            The Gym Builder and Spotter are the two your customers would touch. The other three are the
            unglamorous internal kind — the merch-ops dashboard, the job that runs at 7am so nobody has to
            remember to look, and the copilot that knows when to shut up. That ratio is deliberate; it is
            roughly the ratio in your job description.
          </p>
        </div>
      </section>
    </div>
  );
}
