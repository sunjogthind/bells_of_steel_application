# Bells of Steel — Internal Tools Portfolio

Five working tools built on the live Bells of Steel product catalogue, for the
**AI & Internal Tools Developer** application.

**Live:** https://bells-of-steel-portfolio-rana-thind.vercel.app
**Source:** https://github.com/sunjogthind/bells_of_steel_application

> Independent demonstration by Rana Thind. Not affiliated with, endorsed by, or an official
> property of Bells of Steel Inc. Product data is a read-only snapshot of the public
> storefront catalogue taken 25 August 2026.

## The five tools

| | Tool | What it does |
|---|---|---|
| 01 | **Gym Builder** | Answers "will it fit in my basement" against 20 real rack models, drawn to scale, then shows only the attachments their own `hgb_` compatibility tags say will bolt on. |
| 02 | **Catalogue Audit** | Twelve data-health rules against the real feed. Found 16 rack models listed twice at two different prices, a corrupted vendor field, and 29 freight items shipping with no weight. |
| 03 | **Catalogue Monitor** | A scheduled job that re-pulls the feed every morning, diffs it against the previous run, and reports only what moved. Runs unattended in GitHub Actions and commits each snapshot, so the drift history is real. Emits a BigQuery-shaped time series. |
| 05 | **Spotter** | A retrieval-grounded training coach. Reads a signup profile written in plain language, extracts structured slots, and synthesises a program constrained to the equipment you actually own — resolving any gap to a real product. Refuses to train around an injury. |
| 04 | **CS Copilot** | Drafts grounded replies with citations, and escalates to a human when the catalogue cannot support an answer. Sits on a flattened index of all 68 spare parts. No language model at runtime — deliberately. |

## Notable findings

Everything below is against the real catalogue and verified live:

- **Every prebuilt rack is listed twice, at two different prices.** All 16 comparable
  duplicate pairs disagree. Widest gap: $162.84 on the Manticore Half Rack. Both pages
  return HTTP 200 and are purchasable.
- **9 products have `vendor` set to `related_to_<product_id>`** — a broken app sync writing
  a database key into a customer-facing, feed-required field.
- **29 physical products over $50 carry a shipping weight of 0 g**, on a catalogue that moves
  on LTL freight.
- **The compatibility tags contradict the product titles.** The Utility Seat is titled "for
  Hydra/Manticore" but carries seven Hydra tags and zero Manticore ones, making it invisible
  to their own builder for half the racks it fits.
- **The Residential rack line publishes no dimensions anywhere** — the cheapest, most
  beginner-facing racks, bought by exactly the people working around a low basement ceiling.
- **15 serviceable machines over $500 have no spare parts published**, the most expensive
  being a $5,000 treadmill.

## Running it

```bash
git clone https://github.com/sunjogthind/bells_of_steel_application.git
cd bells_of_steel_application
npm install
npm run dev            # http://localhost:3111
npm run refresh-catalog # re-pull the feed and re-derive everything
```

Four of the five tools need no API key and no runtime services. Spotter's retrieval, slot
extraction and program synthesis all run in the browser.

Spotter's **generation** step is optional. Set `ANTHROPIC_API_KEY` and toggle "Compose with
Claude" and replies are written by Claude Opus 5 from the already-retrieved context. The
output is then verified against that context — any price or set-and-rep scheme the model
names that was not in its input discards the whole generation and falls back to the
deterministic text. That guard is tested: `npm run test:guard`. With no key the page
degrades to the deterministic composer and says so.

`corpus/` holds Spotter's exercise library and coaching notes. **These are written by us**,
not Bells of Steel's — their programming is not public, and reconstructing it would be the
exact failure this project argues against. The equipment half of the corpus is their real
catalogue. Swapping in their library is a data change, not a code change.

The monitor also runs on a daily cron in GitHub Actions
([`.github/workflows/catalog-monitor.yml`](./.github/workflows/catalog-monitor.yml)), re-pulling the
feed, committing the day's snapshot, and posting alerts to Slack when a `SLACK_WEBHOOK` secret is set.
Two polite requests per day with an identifying User-Agent.

## How it is put together

`scripts/` is a seven-step build-time pipeline that turns the raw storefront feed into small
derived datasets. `lib/` is pure logic shared by server and client. `app/` is one route per
tool, with server components trimming data before it reaches the browser — the 4.4 MB raw
feed never ships.

See [CLAUDE.md](./CLAUDE.md) for the conventions and the Bells of Steel domain notes, and
the **Build Log** page on the site for the six things that broke along the way.

## The audit as a skill

`.claude/skills/catalog-audit/` packages the same thirteen checks so someone who cannot
read JavaScript can run them and get a plain-language report. Built in Cowork.

```bash
node .claude/skills/catalog-audit/scripts/run-audit.mjs            # live feed
node .claude/skills/catalog-audit/scripts/run-audit.mjs --snapshot data/catalog-raw.json
node .claude/skills/catalog-audit/scripts/self-test.mjs            # 11 checks
```

The engine measures and `references/plain-language.mjs` writes — every reader-facing
sentence lives there with placeholders filled from each rule's own metrics, so nothing
composes prose at runtime and a non-engineer can edit the wording. Sample output is in
[`catalog-audit/`](./catalog-audit/).

Portability meant a second copy of the rules, which can drift from `scripts/audit.mjs`.
`self-test.mjs` runs both against the same snapshot and compares them finding by finding.

## MCP server

`mcp/` is a Model Context Protocol server that exposes the catalogue to Claude Code, so anyone
at the company could query products, compatibility and spare parts from the terminal without
knowing the SKU scheme or the `hgb_` tag grammar.

```bash
cd mcp && npm install
claude mcp add bells-of-steel -- node "$(pwd)/server.mjs"
```

Four tools: `search_products`, `check_compatibility`, `find_spare_part`, `catalog_health`.
It reads the committed snapshot — no network calls, no API keys. `check_compatibility`
reports "not published" rather than guessing when an attachment carries no compatibility tags.
