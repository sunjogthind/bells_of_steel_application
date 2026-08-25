# Bells of Steel — Internal Tools Portfolio

Four working internal tools built on the live Bells of Steel product catalog, for the
**AI & Internal Tools Developer** application.

**Live:** _(deploy URL)_

> Independent demonstration by Rana Thind. Not affiliated with, endorsed by, or an official
> property of Bells of Steel Inc. Product data is a read-only snapshot of the public
> storefront catalog taken 25 August 2026.

## The four tools

| | Tool | What it does |
|---|---|---|
| 01 | **Gym Builder** | Answers "will it fit in my basement" against 20 real rack models, drawn to scale, then shows only the attachments their own `hgb_` compatibility tags say will bolt on. |
| 02 | **Catalog Audit** | Twelve data-health rules against the real feed. Found 16 rack models listed twice at two different prices, a corrupted vendor field, and 29 freight items shipping with no weight. |
| 03 | **Parts Finder** | Flattens 68 spare parts buried inside 29 parent products into one plain-language searchable index. Also surfaces 15 machines over $500 with no spare parts published at all. |
| 04 | **CS Copilot** | Drafts grounded replies with citations, and escalates to a human when the catalog cannot support an answer. No language model at runtime — deliberately. |

## Notable findings

Everything below is against the real catalog and verified live:

- **Every prebuilt rack is listed twice, at two different prices.** All 16 comparable
  duplicate pairs disagree. Widest gap: $162.84 on the Manticore Half Rack. Both pages
  return HTTP 200 and are purchasable.
- **9 products have `vendor` set to `related_to_<product_id>`** — a broken app sync writing
  a database key into a customer-facing, feed-required field.
- **29 physical products over $50 carry a shipping weight of 0 g**, on a catalog that moves
  on LTL freight.
- **The compatibility tags contradict the product titles.** The Utility Seat is titled "for
  Hydra/Manticore" but carries seven Hydra tags and zero Manticore ones, making it invisible
  to their own builder for half the racks it fits.
- **The Residential rack line publishes no dimensions anywhere** — the cheapest, most
  beginner-facing racks, bought by exactly the people working around a low basement ceiling.

## Running it

```bash
npm install
npm run dev            # http://localhost:3111
npm run refresh-catalog # re-pull the feed and re-derive everything
```

No API keys. No runtime services. The deployed site is fully static.

## How it is put together

`scripts/` is a five-step build-time pipeline that turns the raw storefront feed into small
derived datasets. `lib/` is pure logic shared by server and client. `app/` is one route per
tool, with server components trimming data before it reaches the browser — the 4.4 MB raw
feed never ships.

See [CLAUDE.md](./CLAUDE.md) for the conventions and the Bells of Steel domain notes, and
the **Build Log** page on the site for the six things that broke along the way.
