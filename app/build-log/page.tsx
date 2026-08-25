import { catalogStats, SNAPSHOT_DATE } from '@/lib/catalog';

export const metadata = { title: 'Build Log — Rana Thind × Bells of Steel' };

const BROKE = [
  {
    n: '01',
    title: 'I only fetched half the catalog and did not notice',
    body: `Shopify's products.json takes a limit of 250. Page one came back with 240, so my loop treated "fewer than the limit" as "last page" and stopped. The catalog looked like 240 products and every downstream number was quietly wrong.`,
    fix: `Caught it by spot-checking page 2 by hand rather than trusting the loop. Shopify returns fewer than the limit whenever items are filtered out server-side, so the only reliable stop condition is an empty page. Real size: 476 products, 1,640 variants — I had been reasoning about half a catalog.`,
    lesson: 'A termination condition that reads as obviously correct is exactly the kind that never gets tested.',
  },
  {
    n: '02',
    title: 'My headline finding had a $225 false positive in it',
    body: `The duplicate-pricing rule compares listings that share a title. Two of its top results were "Hydra Vertical Uprights" at $319.99 versus $94.99, and "Manticore Vertical Uprights" at $379.98 versus $179.99 — the two largest gaps in the whole finding.`,
    fix: `Before writing them up I fetched all four product pages. One listing was a multi-variant product (42" pair, 60" single, 60" pair) and the other was a single unnamed variant. I had been comparing a pair against a single. The rule now only compares listings where every side has exactly one variant, which dropped 21 pairs to 16 — and all 16 survivors are genuine.`,
    lesson: 'The finding I was most excited about was the one with the bug in it. Verifying the exciting one first is a good default.',
  },
  {
    n: '03',
    title: 'The copilot gave a confidently wrong compatibility answer',
    body: `I read the hgb_ tag scheme as having two attachment classes, strength and storage, because those were the two that showed up in the counts I looked at. The compatibility check was built on that assumption.`,
    fix: `A test question about a lat pulldown returned "not compatible" for a rack it plainly fits. There are five classes, not two — strength, storage, lat, smith, kraken. Widening the parser fixed the answer and also surfaced a real bug in their catalog: the Utility Seat is titled "for Hydra/Manticore" but carries seven Hydra tags and zero Manticore ones, so their own builder would never offer it to a Manticore customer.`,
    lesson: 'Deriving a schema from the top of a sorted list gives you the common cases and hides the rest.',
  },
  {
    n: '04',
    title: '"Will it fit my 7ft ceiling" was treated as a compatibility question',
    body: `Intent classification ran compatibility before dimensions, and the compatibility pattern matches the word "fit". A question about ceiling height got routed to the rack-and-attachment resolver, which failed to find an attachment and escalated.`,
    fix: `Reordered the patterns so dimensions is checked first, and left a comment saying why — the ordering looks arbitrary and someone will otherwise tidy it back.`,
    lesson: 'Ordered pattern matching encodes decisions that are invisible in the code. Write down the ones that are load-bearing.',
  },
  {
    n: '05',
    title: 'An empty result set rendered as an empty sentence',
    body: `Asked about a true 7ft (84") ceiling, the copilot answered "0 of 20 rack models clear a 7ft ceiling" followed by "these fit:" and nothing at all. The answer was arithmetically right and useless.`,
    fix: `Zero is a real answer here and deserved its own branch: no rack in the range clears 84", the shortest uprights are 84" and need about 86", and the customer should double-check whether they measured to the joist or to the finished ceiling.`,
    lesson: 'The empty state is a case, not an edge case.',
  },
  {
    n: '06',
    title: 'A generated insight tried to overstate itself',
    body: `The Gym Builder writes its own summary line. At a 7'6" ceiling I expected "rules out the entire Hydra line" and wrote the code to say exactly that.`,
    fix: `It refused to. The Hydra Half Rack has 84" uprights and clears that ceiling, so the whole-family branch correctly declined and fell through to a generic message. I rewrote it to state the actual reason — 8 racks with 90" uprights need 92" — which is both true and more useful than the sentence I wanted.`,
    lesson: 'I wrote a guard against overclaiming and then got caught by it. That is the guard working.',
  },
];

const DECISIONS = [
  {
    q: 'Why is there no language model at runtime?',
    a: `Three of the four tools are deterministic and the fourth could have been a chat box. A model would have made the prose warmer and the facts less trustworthy. Grounding, retrieval and the escalation policy are the parts that decide whether the output is safe; the model only decides how it reads. Building the hard half first also means the demo costs nothing to run, cannot be broken by a rate limit, and cannot hallucinate in front of the person evaluating it.`,
  },
  {
    q: 'Why does the UI keep saying "estimated" and "not published"?',
    a: `Because a fit tool that silently guesses a ceiling clearance is worse than no fit tool. Every dimension carries where it came from, and the Residential racks — which publish no dimensions at all — return "cannot verify" instead of a number. The gap is the finding.`,
  },
  {
    q: 'Why build on their real catalog rather than mock data?',
    a: `Mock data would have let me build all four tools in half the time and demonstrate nothing. Every interesting thing here — the hgb_ compatibility graph, the duplicate listings, the corrupted vendor field, the treadmill with no spare parts — came out of reading data that actually exists.`,
  },
];

export default function Page() {
  const s = catalogStats();
  const stats = [
    { k: '2,454', v: 'lines of TypeScript' },
    { k: '20', v: 'source files' },
    { k: '5', v: 'build-time pipeline steps' },
    { k: '6', v: 'bugs worth writing down' },
  ];

  return (
    <div className="gridbg">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-steel">Build log</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">How this was built</h1>
        <p className="mt-4 leading-relaxed text-muted">
          Four tools, one shared data layer, built with Claude Code in the terminal against a snapshot
          of the Bells of Steel storefront feed taken {SNAPSHOT_DATE}. The interesting part was not the
          building. It was the six times I was wrong.
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
          {stats.map((x) => (
            <div key={x.v} className="bg-panel px-4 py-5">
              <dt className="font-mono text-xl font-semibold tabular-nums">{x.k}</dt>
              <dd className="mt-1 text-[11px] leading-snug text-muted">{x.v}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">What broke</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Written up honestly, including the two that would have made it into the interview as confident
          wrong statements if I had not checked.
        </p>

        <div className="mt-6 space-y-3">
          {BROKE.map((b) => (
            <details key={b.n} className="group rounded-lg border border-line bg-panel" open={b.n === '02'}>
              <summary className="flex cursor-pointer list-none items-baseline gap-3 p-5">
                <span className="font-mono text-xs text-steel">{b.n}</span>
                <span className="flex-1 font-medium leading-snug">{b.title}</span>
                <span className="font-mono text-xs text-muted transition-transform group-open:rotate-90">›</span>
              </summary>
              <div className="space-y-3 border-t border-line px-5 py-5">
                <p className="text-sm leading-relaxed text-muted">{b.body}</p>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-steel">How it got caught</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{b.fix}</p>
                </div>
                <p className="rounded border border-line bg-ink/40 p-3 text-sm italic leading-relaxed text-bright/75">
                  {b.lesson}
                </p>
              </div>
            </details>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">Decisions worth defending</h2>
        <div className="mt-5 space-y-5">
          {DECISIONS.map((d) => (
            <div key={d.q} className="rounded-lg border border-line bg-panel p-5">
              <p className="font-medium">{d.q}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{d.a}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">The pipeline</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Five build-time steps. Nothing is fetched at runtime, so the deployed site is fully static and
          the {s.products}-product feed never reaches the browser.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-ink/60 p-4 font-mono text-[11px] leading-relaxed text-muted">
{`fetch-catalog  →  products.json, paginated, 600ms apart   →  data/catalog-raw.json  (4.4 MB)
normalize      →  spec extraction + data-issue flags      →  data/catalog.json      (1.0 MB)
audit          →  12 catalog-health rules                 →  data/audit.json
parts          →  68 spare parts + coverage gaps          →  data/parts.json
copilot        →  retrieval index + IDF table             →  data/copilot.json`}
        </pre>

        <div className="mt-10 rounded-lg border border-line bg-panel p-5">
          <h2 className="text-sm font-semibold">CLAUDE.md</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The repo has one, and it is specific to this project rather than a generic template. It carries
            the rule the whole codebase is organised around (never invent a fact about someone else&rsquo;s
            business), the verification steps every audit finding has to pass, and the Bells of Steel domain
            notes — the hgb_ tag grammar, the hole-size constraint, the duplicate-handle pattern — that took
            the longest to work out and would take the longest to rediscover.
          </p>
        </div>
      </div>
    </div>
  );
}
