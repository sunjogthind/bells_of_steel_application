---
name: catalog-audit
description: Runs a data-quality audit against the live Bells of Steel product catalog and writes a plain-language report a merch coordinator can act on - duplicate listings priced differently, missing shipping weights, corrupted brand fields, out-of-stock pages still live, missing spare parts, and eight more checks. Use this whenever someone asks about catalog health, product data quality, listing errors, duplicate products, pricing mismatches, missing weights or SKUs or images, whether anything is wrong with the store, or asks for a catalog check, catalog audit, product feed review, or "what's broken in the catalog" - including when they do not use the word "audit". Also use it when someone asks what needs attention in the catalog today or this week.
---

# Catalog Audit

Thirteen data-quality checks against the live Bells of Steel storefront feed, turned into
a report the person who fixes catalog data can read without asking anyone what it means.

The reader is a merch coordinator. They know the products cold and have never opened a
terminal. Everything below exists to keep that true.

## How it works

Two scripts. The first measures, the second writes.

```
scripts/run-audit.mjs      reads the catalog, runs the 13 rules, writes a findings file
scripts/render-report.mjs  turns that findings file into Markdown and HTML
references/plain-language.mjs   the sentences the reader sees - edit here, nowhere else
scripts/self-test.mjs      proves the clean case works and the rules have not drifted
```

Nothing composes prose at runtime. Every number in the report is measured by the engine,
and every sentence around it is written by hand in `references/plain-language.mjs` with
the measurements substituted in. That is deliberate: this report makes assertions about a
real company's live store, so no sentence in it can be one a model made up.

Requires Node 18 or newer. No API key, no install step, no repo checkout.

## Running it

Default - read the live storefront, then write both formats:

```bash
node scripts/run-audit.mjs --out catalog-audit/findings-$(date +%F).json
node scripts/render-report.mjs catalog-audit/findings-$(date +%F).json \
  --md   catalog-audit/catalog-health-$(date +%F).md \
  --html catalog-audit/catalog-health-$(date +%F).html
```

The fetch is polite: 250 products a page, 600ms apart, and it identifies itself. It takes
about fifteen seconds.

**When a fresh pull is not wanted** - the network will not reach the store, or the question
is about a catalog as it stood on a particular day - point it at a saved feed instead:

```bash
node scripts/run-audit.mjs --snapshot data/catalog-raw.json --out catalog-audit/findings.json
```

The report says which day the catalog was read, either way. If the live read fails, say so
and offer the saved copy. Do not report on a catalog that could not be read.

**Publishing the report.** `--fragment <file.html>` writes an Artifact-ready version of the
same page (head tags plus body, no document skeleton). Publish that with the Artifact tool
when the reader wants a link to send on rather than a file.

## What to say in the conversation

Deliver the files, then give the five-second answer in two or three sentences: the verdict
line from the top of the report, what the worst finding is, and how many findings there are
in total. Point at the report for the rest.

Do not re-explain the findings in chat, and do not add analysis of your own. The report is
already the considered version, and anything added on top is a claim nobody checked.

If the audit comes back clean, say that plainly. A clean run is a real result - the rules
ran, they found nothing, and the coordinator needs to know that as much as they need a
list of problems. Do not pad it out to look like more.

## Voice

The report is written by Rana Thind, addressed to Bells of Steel. Anything you write around
it follows the same rules.

- **"Your catalog", never "their catalog".** The reader works there.
- **Short.** Past roughly 250 characters a paragraph is usually justifying itself. Cut to
  the claim.
- **Plain English, full sentences.** No exclamation marks, no hype, no emoji.
- **No engineering vocabulary.** If the output contains "BM25", "regex", "normalization",
  `product_type`, `compare_at_price`, `hgb_` or "301 redirect", it has failed. Say
  "category", "compare-at price", "which racks it fits", "point one page at the other".
- **Never invent a fact about their business.** Every number traces to the catalog. If the
  catalog does not publish something, the answer is "not published" - never an estimate
  dressed up as a spec. This is the rule the whole thing rests on.

## The checks

Ranked worst first. Severity is about what it costs, not how hard it is to fix.

| Severity | Check | What it looks for |
|---|---|---|
| Critical | `duplicate-pricing` | Prebuilt racks listed on two live pages at two different prices |
| High | `zero-price` | Buyable options at $1.00 or less exposed in the public feed |
| High | `zero-weight` | Products over $50 that ship, with no weight recorded |
| High | `vendor-corrupt` | A database code where the brand name should be |
| High | `compat-graph` | Attachments missing from racks their own titles say they fit |
| High | `parts-coverage` | Machines over $500 with no spare parts published |
| Medium | `fake-sale` | A crossed-out "was" price matching the price charged |
| Medium | `oos-published` | Live pages with nothing in stock on any option |
| Medium | `taxonomy` | Products with no category, or "Hidden" used as one |
| Medium | `specs-hidden` | Spec tables switched off; Residential racks with no published height |
| Low | `missing-sku` | Options with no SKU |
| Low | `thin-description` | Under 120 characters of description |
| Low | `no-images` | No photo at all |

Three further checks pass today and are reported as passing rather than left out: no SKU is
shared by two products, discontinued products really are unbuyable, and the brand name is
correct everywhere else.

A check that finds nothing is dropped from the findings list rather than shown as a zero.
The clean checks section is where "we looked and it was fine" belongs.

## Changing it

**The wording is wrong.** Edit `references/plain-language.mjs`. Each finding has a `title`,
a `what`, a `why` and a `do`. `{placeholders}` are filled from that finding's own
measurements - the keys available are the ones the rule puts in its `metrics` object.

**A rule is wrong, or there is a new one.** Edit `scripts/run-audit.mjs`. Before adding a
check, confirm it against the raw feed rather than a cleaned-up copy, and confirm the
comparison is like-for-like. The duplicate-pricing rule only compares single-variant
listings because an earlier version compared a "pair" listing against a "single" and
produced a $225 false positive.

Then run the self-test:

```bash
node scripts/self-test.mjs
```

It checks that a clean catalog produces a clean report rather than an empty one, that every
rule that fires has plain-language copy written for it, that no engineering vocabulary or
unfilled placeholder reached the output - and, when run from inside the portfolio repo,
that this engine still agrees finding for finding with `scripts/audit.mjs`.

This skill carries its own copy of the audit logic so it runs without the repo. That copy
can drift. The parity check is what catches it, so run the self-test after touching either
side.
