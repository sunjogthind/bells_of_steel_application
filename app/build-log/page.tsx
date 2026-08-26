import { catalogStats, SNAPSHOT_DATE } from '@/lib/catalog';

export const metadata = { title: 'Build Log · Rana Thind × Bells of Steel' };

const BROKE = [
  {
    n: '01',
    title: 'I only fetched half the catalogue and did not notice',
    body: `Shopify's products.json takes a limit of 250. Page one came back with 240, so my loop treated "fewer than the limit" as "last page" and stopped. The catalogue looked like 240 products and every downstream number was quietly wrong.`,
    fix: `Caught it by spot-checking page 2 by hand rather than trusting the loop. Shopify returns fewer than the limit whenever items are filtered out server-side, so the only reliable stop condition is an empty page. Real size: 476 products, 1,640 variants, I had been reasoning about half a catalogue.`,
    lesson: 'A termination condition that reads as obviously correct is exactly the kind that never gets tested.',
  },
  {
    n: '02',
    title: 'My headline finding had a $225 false positive in it',
    body: `The duplicate-pricing rule compares listings that share a title. Two of its top results were "Hydra Vertical Uprights" at $319.99 versus $94.99, and "Manticore Vertical Uprights" at $379.98 versus $179.99, the two largest gaps in the whole finding.`,
    fix: `Before writing them up I fetched all four product pages. One listing was a multi-variant product (42" pair, 60" single, 60" pair) and the other was a single unnamed variant. I had been comparing a pair against a single. The rule now only compares listings where every side has exactly one variant, which dropped 21 pairs to 16, and all 16 survivors are genuine.`,
    lesson: 'The finding I was most excited about was the one with the bug in it. Verifying the exciting one first is a good default.',
  },
  {
    n: '03',
    title: 'The copilot gave a confidently wrong compatibility answer',
    body: `I read the hgb_ tag scheme as having two attachment classes, strength and storage, because those were the two that showed up in the counts I looked at. The compatibility check was built on that assumption.`,
    fix: `A test question about a lat pulldown returned "not compatible" for a rack it plainly fits. There are five classes, not two, strength, storage, lat, smith, kraken. Widening the parser fixed the answer and also surfaced a real bug in your catalogue: the Utility Seat is titled "for Hydra/Manticore" but carries seven Hydra tags and zero Manticore ones, so your own builder would never offer it to a Manticore customer.`,
    lesson: 'Deriving a schema from the top of a sorted list gives you the common cases and hides the rest.',
  },
  {
    n: '04',
    title: '"Will it fit my 7ft ceiling" was treated as a compatibility question',
    body: `Intent classification ran compatibility before dimensions, and the compatibility pattern matches the word "fit". A question about ceiling height got routed to the rack-and-attachment resolver, which failed to find an attachment and escalated.`,
    fix: `Reordered the patterns so dimensions is checked first, and left a comment saying why, the ordering looks arbitrary and someone will otherwise tidy it back.`,
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
    fix: `It refused to. The Hydra Half Rack has 84" uprights and clears that ceiling, so the whole-family branch correctly declined and fell through to a generic message. I rewrote it to state the actual reason, 8 racks with 90" uprights need 92", which is both true and more useful than the sentence I wanted.`,
    lesson: 'I wrote a guard against overclaiming and then got caught by it. That is the guard working.',
  },
  {
    n: '07',
    title: 'Six routes returned HTTP 200 and the site was completely inaccessible',
    body: `After renaming the Vercel project, every route on the new URL returned 200. I nearly stopped there. The body of those responses was Vercel's own login page, the site was behind an authentication wall and every visitor would have hit a sign-in screen.`,
    fix: `Caught it by grepping the response body for the page title instead of trusting the status code. The cause: Vercel's deployment protection exempts only the project's originally-assigned production domain, and renaming does not move that exemption to the new aliases. Fixed by registering the new domain to the project explicitly.`,
    lesson: 'A 200 means the server answered, not that it answered with your site. Assert on content, not on status.',
  },
  {
    n: '08',
    title: 'The same comparison bug, for the third time',
    body: `Packaging the audit as a skill meant it had to be readable by someone who has never opened a terminal, so I wrote a test that greps the rendered report for words that mean it has failed, BM25, regex, normalization, product_type, compare_at_price, hgb_, 301.`,
    fix: `The test failed on 301. It was matching $1301.86, the price of the Hydra Four Post rack, inside a redirect code. Word boundaries fixed it in a minute. What stopped me was recognising it: this is the same error as the $225 duplicate-pricing false positive and the guard that rejected "4 x 4-6", a comparison that looked like-for-like and wasn't.`,
    lesson: 'Three times on one project. I am now suspicious of every comparison I write before I run it, which is roughly the correct amount of suspicious.',
  },
  {
    n: '09',
    title: 'The fourth one, and the first a person caught',
    body: `The critical finding said the same rack sits on two live pages at two different prices. Someone reading it noticed that one of the two Hydra Six Post listings showed a 1% discount badge and the other did not, and asked whether that was simply the explanation.`,
    fix: `Checking properly turned up something worse than the discount: all 16 pairs have different SKUs, the plain handle carrying a "-BNDL" suffix. I had asserted these were the same product without ever comparing SKUs, and the write-up went further and called the gap "two listings drifting apart rather than a deliberate discount", a claim about intent I had no evidence for. Both objections turned out answerable. Shipping weight, product copy and image filenames are identical on 16 of 16 pairs, so the suffix is bookkeeping rather than a different rack. And the discount is not the cause: pre-discount prices differ on all 16, and on 6 the gap is wider before the sale. The finding now states both, with the numbers.`,
    lesson: 'The first three were caught by tests I had written. This one was caught by a person looking at one product page and asking a reasonable question. Tests only check the comparisons you already thought to make.',
  },
];

const DECISIONS = [
  {
    q: 'Why is most of this deterministic?',
    a: `Retrieval, grounding and escalation decide whether an answer is safe. A model only decides how it reads. Building the hard half first means four of the five tools cost nothing to run and cannot hallucinate. Spotter has Claude wired in on top, with its output checked back against the retrieved context.`,
  },
  {
    q: 'Why does the UI keep saying "estimated" and "not published"?',
    a: `A fit tool that silently guesses a ceiling clearance is worse than no fit tool. Every dimension carries where it came from, and the three Residential racks return "cannot verify" instead of a number. The gap is the finding.`,
  },
  {
    q: 'Why build on your real catalogue rather than mock data?',
    a: `Mock data would have been half the work and demonstrated nothing. The hgb_ graph, the duplicate listings, the corrupted vendor field, the treadmill with no spare parts. All of it came out of reading data that actually exists.`,
  },
];

export default function Page() {
  const s = catalogStats();
  const stats = [
    { k: '2,454', v: 'lines of TypeScript' },
    { k: '20', v: 'source files' },
    { k: '6', v: 'build-time pipeline steps' },
    { k: '9', v: 'bugs worth writing down' },
  ];

  return (
    <div className="gridbg">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-steel">Build log</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">How this was built</h1>
        <p className="mt-4 leading-relaxed text-muted">
          Five tools and one shared data layer, built with Claude Code in the terminal against a snapshot
          of your storefront feed taken {SNAPSHOT_DATE}, plus a skill built in Cowork. The interesting part
          was not the building. It was the nine times I was wrong.
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
          Written up honestly, including the two that would have reached you as confident wrong statements
          if I had not checked them first, and one class of mistake I made four separate times.
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
                <p className="rounded border border-line bg-ink p-3 text-sm italic leading-relaxed text-dim">
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
          Six build-time steps. Nothing is fetched at runtime, so the deployed site is fully static and
          the {s.products}-product feed never reaches the browser.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-ink p-4 font-mono text-[11px] leading-relaxed text-muted">
{`fetch-catalog  →  products.json, paginated, 600ms apart   →  data/catalog-raw.json  (4.4 MB)
normalize      →  spec extraction + data-issue flags      →  data/catalog.json      (1.0 MB)
parts          →  68 spare parts + coverage gaps          →  data/parts.json
audit          →  13 catalog-health rules                 →  data/audit.json
copilot        →  retrieval index + IDF table             →  data/copilot.json
monitor        →  fingerprint, diff vs. last run          →  data/monitor.json
                                                          →  data/timeseries.csv`}
        </pre>

        <div className="mt-10 rounded-lg border border-line bg-panel p-5">
          <h2 className="text-sm font-semibold">The audit, as a skill</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The Catalogue Audit page is built for someone evaluating me. The person who would actually fix the
            data needs something else, so I packaged the same thirteen checks as a skill, built in Cowork, 
            that runs without a repo checkout and writes a plain-language report.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The engine measures; a separate file writes. Every sentence the reader sees lives in one copy
            file with placeholders filled from each rule&rsquo;s own numbers, so nothing composes prose at
            runtime and a non-engineer can change the wording. Making it portable cost a second copy of the
            rules, which can drift, <code className="text-steelDim">self-test.mjs</code> runs both engines
            against the same snapshot and compares them finding by finding.
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-line bg-panel p-5">
          <h2 className="text-sm font-semibold">An MCP server, too</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The repo ships an MCP server putting the catalogue behind four tools in Claude Code:{' '}
            <code className="text-steel">search_products</code>,{' '}
            <code className="text-steel">check_compatibility</code>,{' '}
            <code className="text-steel">find_spare_part</code>,{' '}
            <code className="text-steel">catalog_health</code>.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Ask it whether the batwing storage fits a Manticore four post and it says no, with the
            reason: Hydra is ⅝&Prime; holes, Manticore is 1&Prime;. No tags means &ldquo;not
            published&rdquo;, not a guess.
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-line bg-panel p-5">
          <h2 className="text-sm font-semibold">
            <a href="https://github.com/sunjogthind/bells_of_steel_application/blob/main/CLAUDE.md" target="_blank" rel="noopener noreferrer"
               className="underline decoration-line underline-offset-4 hover:decoration-steel">
              CLAUDE.md ↗
            </a>
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Specific to this project, not a generic template. It carries the rule the codebase is organised
            around, never invent a fact about someone else&rsquo;s business, the verification steps every
            audit finding has to pass, and the domain notes that took longest to work out: the hgb_ tag
            grammar, the hole-size constraint, the duplicate-handle pattern.
          </p>
        </div>
      </div>
    </div>
  );
}
