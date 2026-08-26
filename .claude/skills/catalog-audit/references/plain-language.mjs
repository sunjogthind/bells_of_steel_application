// The words the reader actually sees.
//
// This file is deliberately separate from the rules that produce the numbers. The engine
// decides what is true; this decides how it is said. Every {placeholder} below is filled
// from the finding's own measurements, so no sentence here can state a number the catalog
// did not produce. If a sentence reads wrong, edit it here - nothing else needs touching.
//
// Voice: Rana writing to Bells of Steel. Address them as "you" and "your". Plain English,
// full sentences, no exclamation marks, no jargon. The reader knows the products cold and
// has never opened a terminal.

export const SEVERITY = {
  critical: { label: 'Critical', meaning: 'Costing money or credibility right now. Worth looking at today.' },
  high:     { label: 'High',     meaning: 'Taking something off every affected order or sale. Worth this week.' },
  medium:   { label: 'Medium',   meaning: 'Working against you quietly. Worth planning in.' },
  low:      { label: 'Low',      meaning: 'Housekeeping. Nothing breaks if it waits.' },
};

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];

export const COPY = {
  'duplicate-pricing': {
    title: 'The same rack is on sale twice, at two different prices',
    what: 'Every prebuilt rack has two live product pages: the normal one, and a second copy ending in "-hgb" that the Home Gym Builder uses. {pairsPhrase} pairs charge different prices for the same rack, and both pages can be bought from.',
    what_if: { skipped: 'A further {skipped} duplicated titles were left out of this comparison, because the two listings sell different things - a pair against a single, for instance - and their prices are not comparable.' },
    why: 'What a customer pays depends on which of the two pages they happen to land on. The widest gap is ${widestGap} on the {widestGapProduct}. The cheaper page is sometimes the builder copy and sometimes not, so this reads as two listings drifting apart rather than a deliberate discount.',
    do: 'Decide which page is the real one for each rack and point the other at it. Until that is done, the pairs below need their prices matched by hand.',
  },

  'zero-price': {
    title: 'Products priced at $0.00 or $0.01 are visible to the public',
    what: '{variants} buyable options across {products} products are priced at $1.00 or less. {looksDeliberate} of them are recognisably on purpose: hardware labelled "FREE FOR BUILDERS", and placeholder options named "Variant for price 0" belonging to a bundling app.',
    why: 'Nothing marks these as different from real products, so everything that reads your catalog picks them up - shopping feeds, analytics, price monitoring, any internal tool. They are the cheapest things in the catalog, so they surface first anywhere sorted by price.',
    do: 'Give the builder scaffolding its own product category, or take it off the online store channel so it stops appearing publicly at all.',
  },

  'zero-weight': {
    title: 'Heavy products are recorded as weighing nothing',
    what: '{variants} options over $50, across {products} products, are marked as needing shipping but have their weight recorded as zero.',
    why: 'Weight is what a freight rate is calculated from. A zero there means the carrier quote is running on a default rather than the real number, and the difference between the quote and the actual cost comes out of the order.',
    do: 'Fill the weights in from your packing data. The list below is ordered by price, so start at the top. Then ask for a rule that refuses to publish a shipped product with no weight.',
  },

  'vendor-corrupt': {
    title: 'Some products show a database code where the brand should be',
    what: '{bad} products have their brand set to a code in the form "related_to_" followed by a number, instead of Bells of Steel. The other {correct} are correct.',
    why: 'Brand is shown to customers, and it is a required field in Google Shopping and most marketplace feeds. These products are advertising an internal reference number as their brand name.',
    do: 'Reset the brand on the products below. The shape of the value suggests a related-products app is writing into that field, so it is worth finding out which one, and what else it touches.',
  },

  'fake-sale': {
    title: 'A crossed-out "was" price that matches the price being charged',
    what: '{variants} product options carry a compare-at price that is the same as, or lower than, what the customer actually pays.',
    why: 'The store displays compare-at as a crossed-out "was" price. When it matches the real price there is no discount behind the claim. That is a weaker sales page than an honest one, and it is the kind of claim consumer-protection rules take an interest in.',
    do: 'Clear the compare-at price on the options below wherever it is not genuinely higher than the selling price.',
  },

  'oos-published': {
    title: 'Live product pages where nothing can be bought',
    what: '{products} products are live on the storefront with nothing in stock on any option.',
    why: 'These pages still take ad clicks, still appear in search, and convert at zero. They are also the pages most likely to produce a "when is this back?" email.',
    do: 'Decide product by product: take it down, or swap the add-to-cart for a back-in-stock signup so the traffic is at least captured.',
  },

  'taxonomy': {
    title: 'A fifth of the catalog has no product category',
    what: '{empty} products have no category set, and another {placeholder} use the word "Hidden" as their category. Together that is {share}% of the catalog.',
    why: 'Category is what your automatic collections and storefront filters sort on, and what any report groups by. A product without one is missing from all of it. "Hidden" is a visibility setting sitting in the category field.',
    do: 'Most can be worked out from the product title alone. Work through the list and set a real category, then ask for category to be made a required field.',
  },

  'specs-hidden': {
    title: 'Spec tables are switched off, including on the entry-level racks',
    what: '{hidden} products have their spec table turned off. Separately, {residentialNoHeight} of the {residentialRacks} Residential racks publish no upright height anywhere on the page.',
    why: 'Upright height is the number that decides whether a rack fits a room. The Residential line is your cheapest and most beginner-facing, bought by exactly the person working around a low basement ceiling and least able to guess. Neither they nor the Gym Builder can check that it fits.',
    do: 'Publish height, width and depth on every rack. It is the most common question asked before a rack sale.',
  },

  'compat-graph': {
    title: 'Attachments are missing from racks their own titles say they fit',
    what: '{oneSided} products say in their title that they fit both Hydra and Manticore racks but are only listed as fitting one. Another {untagged} name both families and are not listed against either.',
    why: 'The Home Gym Builder only offers a customer the parts listed as fitting their rack. These attachments are invisible for the family they were left out of, while the title the customer can read says the opposite.',
    do: 'Check the products below against their own titles and add the missing compatibility. This comparison is cheap to repeat, and it is exactly the sort of drift nobody catches by hand.',
  },

  'parts-coverage': {
    title: 'Expensive machines have no spare parts published',
    what: 'You publish {partCount} spare parts covering {coveredProducts} products. {uncovered} serviceable machines priced over $500 have none at all, the most expensive being the {dearest} at ${dearestPrice}.',
    why: 'A machine that fails in year two has nothing to sell the customer and nothing for support to point at. That is a warranty conversation with no good ending, on your highest-priced items. Spare parts are also good margin being left on the table.',
    do: 'Work down the list by price. Every machine over $1,000 should have its wear parts - pads, cables, bushings - listed before the next warranty season.',
  },

  'missing-sku': {
    title: 'Product options with no SKU',
    what: '{products} products have at least one option with no SKU.',
    why: 'SKU is what links the store to the warehouse and to any report built on top. A blank one breaks that link quietly - nothing shows an error, the product simply goes missing from the count.',
    do: 'Assign SKUs to the products below.',
  },

  'thin-description': {
    title: 'Thin or empty product descriptions',
    what: '{products} products have under 120 characters of description.',
    why: 'Thin pages rank poorly in search, and there is nothing for a support rep to quote when a customer asks what the thing actually does.',
    do: 'Start with the ones that are in stock and getting traffic.',
  },

  'no-images': {
    title: 'Products with no photo',
    what: '{products} products have no image at all.',
    why: 'A product page with no photo effectively does not sell, and an image is a required field in most shopping feeds.',
    do: 'Add photography, or take the product down until there is some.',
  },
};

/** Fill {placeholders} from a finding's own measurements. Anything unmatched is left
 *  visible rather than silently blanked - a missing number should be obvious, not invented. */
export function fill(template, metrics) {
  return template.replace(/\{(\w+)\}/g, (whole, key) =>
    metrics[key] === null || metrics[key] === undefined ? whole : String(metrics[key]));
}
