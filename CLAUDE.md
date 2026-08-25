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
- Prefer deterministic logic over a model call. A model is for prose, not for facts.

## Do not

- Do not add a runtime dependency on any API key. The site must stay free to run and
  impossible to break at demo time.
- Do not clone Bells of Steel branding. This is clearly an independent demo, and the
  footer disclaimer stays on every page.
- Do not re-fetch the catalog on every build. The snapshot date is quoted throughout
  the copy; changing the data silently makes that copy wrong.
