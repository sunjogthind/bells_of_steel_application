# CLAUDE.md

Portfolio of four internal tools built on the live Bells of Steel product catalog,
for the AI & Internal Tools Developer application. Next.js 14 App Router, TypeScript,
Tailwind. Deployed on Vercel as a fully static site.

## The one rule that matters

**Never invent a fact about someone else's business.**

Every number rendered on this site traces to the Bells of Steel storefront feed. If the
catalog does not publish something, the correct output is "not published" — never an
estimate presented as a spec, and never a plausible-sounding guess.

This is enforced structurally, not by good intentions:

- `lib/fit.ts` tags every dimension with a `Provenance` of `'copy' | 'estimated' | 'unknown'`,
  and the UI renders that tag next to the number. Estimates are labelled as estimates in the
  interface, not just in a comment.
- `lib/copilot.ts` returns `escalate: true` rather than answering when retrieval is weak,
  the intent is out of scope, or the underlying field is missing.
- Anything derived rather than sourced says so in the copy the user actually reads.

If you are adding a feature and find yourself filling a gap with a reasonable-sounding
default, stop. The gap is the finding.

Spotter has two further refusals that are load-bearing, not decoration: any mention of pain
stops program generation and routes to a human, and a retrieval score below the grounding
threshold produces "I don't know" rather than an improvised answer. Do not soften either to
make a demo flow better.

## Verify before you claim

Findings in the audit are assertions about a real company's live store. Before adding one:

1. Check it against the raw feed, not the normalized data — normalization can mask the bug.
2. Confirm the comparison is like-for-like. The duplicate-pricing rule only compares
   single-variant listings, because an early version compared a "pair" listing against a
   "single" listing and produced a $225 false positive.
3. Where a claim depends on a page being live, fetch it and record the status in the
   finding's `verified` field.

## Layout

```
scripts/          Build-time pipeline. Order matters; each writes to data/.
  fetch-catalog   Pulls products.json (paginated, 600ms apart, identifies itself)
  normalize       Raw feed -> shared shape, extracts specs, flags data issues
  parts           Flattens spare-part variants -> data/parts.json
  audit           Catalog-health findings -> data/audit.json  (reads parts.json)
  copilot         Retrieval index + IDF table -> data/copilot.json
  monitor         Fingerprints, diffs against the last run, appends history
                  -> data/snapshots/<iso>.json, data/monitor.json, data/timeseries.csv
  spotter         RAG index over corpus/ + the real catalog -> data/spotter.json

corpus/           Spotter's exercise library and coaching notes. OURS, not theirs.
                  Never present this content as Bells of Steel's methodology.

lib/              Pure logic, no I/O. Runs identically on server and client.
  fit.ts          Fit engine + the hgb_ compatibility graph
  copilot.ts      Intent classification, retrieval, escalation policy

app/              One route per demo. Server components read data/, pass trimmed
                  props to client components. The 4MB raw feed never ships.
```

`npm run refresh-catalog` runs the whole pipeline in order. The daily GitHub Actions
workflow calls exactly this, so anything that breaks locally breaks the cron too.

Snapshots in `data/snapshots/` are append-only history. Never edit or delete one to make
a chart look better — the honesty of the drift history is the entire point of the monitor.
A run with zero changes is a correct and expected result, and the UI says so rather than
padding it.

## Bells of Steel domain notes

Learned from the feed; not documented anywhere public.

- **`hgb_` tags are a compatibility graph.** 94 of them. Racks carry
  `hgb_<family>_prebuilt`; attachments carry `hgb_<family>_<frame>_<class>`.
  Families: hydra, manticore, residential. Frames: `4post`, `6post`, `half`,
  `collegiate`, `flat`, `squatstand`, `folding_2post`, `folding_4post`.
  Classes: `strength`, `storage`, `lat`, `smith`, `kraken`.
  Missing a class silently under-reports compatibility — `lat` was missed on the
  first pass and cost a wrong answer in the copilot.
- **Hole size is a hard physical constraint.** Hydra is 3"x3" with ⅝" holes,
  Manticore is 3"x3" with 1" holes. Attachments do not cross families. Their own
  product copy warns about this.
- **Specs live in marketing prose, not spec fields.** Upright heights and crossmember
  widths are parsed out of `body_html`. Coverage is partial by design — the Residential
  line publishes no dimensions at all, which is itself a finding.
- **Every prebuilt rack is listed twice**, at `<handle>` and `<handle>-hgb`. The two
  copies disagree on price. Do not assume one handle per product.

## Conventions

- Tailwind utilities inline; no component library. Palette is in `tailwind.config.ts`.
- Comments explain *why*, never *what*. A comment restating the code gets deleted.
- Copy is written in full sentences and plain language. No exclamation marks, no
  "leverage", no em-dash-joined marketing clauses.
- **Voice: Rana writing to Bells of Steel.** Address them as "you" and "your". Never
  describe the company in the third person - "their catalog" reads like a case study
  written for somebody else. Two exceptions: the footer disclaimer names the company
  formally because it is a legal statement, and inside the Gym Builder and Spotter tools
  "you" already means the gym customer, so the company is named rather than addressed.
  Singular "their" for a rep or a member is correct English and stays.
- **Say it once, short.** No paragraph should explain a decision the reader did not
  challenge. If a block runs past roughly 250 characters it is usually justifying itself -
  cut to the claim. Do not restate the same guarantee in three consecutive panels.
- Prefer deterministic logic over a model call. A model is for prose, not for facts.

## Do not

- Do not add a runtime dependency on any API key. The site must stay free to run and
  impossible to break at demo time. Spotter's Claude composer is the single exception and it
  is opt-in, rate-limited, and degrades to deterministic text on every failure path -
  missing key, rate limit, refusal, empty completion, or a failed output check.
- Never let the model decide a fact. It receives facts already derived and documents already
  retrieved, and rewrites them. `lib/spotter-guard.ts` verifies the result and discards it if
  a price or set scheme appears that was not in the input. Keep that guard's tests passing
  (`npm run test:guard`) - a guard that wrongly rejects good output fails silently.
- Do not clone Bells of Steel branding. This is clearly an independent demo, and the
  footer disclaimer stays on every page.
- Do not re-fetch the catalog on every build. The snapshot date is quoted throughout
  the copy; changing the data silently makes that copy wrong.
