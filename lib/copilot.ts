/* ------------------------------------------------------------------ *
 * The CS copilot's answer engine.
 *
 * There is no language model behind this. Every fact in every answer is
 * looked up in the catalogue and carries the URL it came from, and any
 * question the catalogue cannot answer is routed to a human rather than
 * approximated. Adding a model on top would improve the prose; it would
 * not improve - and could easily damage - the part that matters.
 * ------------------------------------------------------------------ */

export type Doc = {
  id: number; title: string; url: string; type: string | null; family: string | null;
  hgb: string[]; priceCents: number | null; priceMaxCents: number | null;
  available: boolean; specs: Record<string, any>; snippet: string;
};
export type PartRow = {
  name: string; sku: string | null; machine: string; priceCents: number; url: string; available: boolean;
};
export type Index = {
  docs: Doc[]; idf: Record<string, number>;
  parts: PartRow[]; dupPrices: Record<string, { url: string; priceCents: number; handle: string }[]>;
};

export type Intent = 'compatibility' | 'dimensions' | 'price' | 'stock' | 'parts' | 'policy' | 'unknown';
export type Citation = { title: string; url: string; note: string };
export type Answer = {
  intent: Intent;
  confidence: 'high' | 'medium' | 'none';
  headline: string;
  body: string[];
  citations: Citation[];
  escalate: boolean;
  escalateReason?: string;
  trace: string[];
};

const STOP = new Set('a an and are as at be by for from has have how i in is it its my of on or that the this to was what when where which will with you your do does can could would should me my'.split(' '));
export const tok = (s: string) =>
  (s || '').toLowerCase().replace(/[^a-z0-9./"\- ]/g, ' ').split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t));

const money = (c: number | null) => (c == null ? 'n/a' : `$${(c / 100).toFixed(2)}`);

/* ---------------- retrieval ---------------- */

export function retrieve(q: string, ix: Index, limit = 6) {
  const qt = tok(q);
  if (!qt.length) return [];
  return ix.docs
    .map((d) => {
      const title = tok(d.title), type = tok(d.type ?? ''), snip = tok(d.snippet);
      let s = 0;
      qt.forEach((t) => {
        const w = ix.idf[t] ?? 1.5;
        if (title.includes(t)) s += w * 3;
        else if (type.includes(t)) s += w * 2;
        else if (snip.includes(t)) s += w * 1;
      });
      return { doc: d, score: s };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ---------------- intent ---------------- */

const RX: [Intent, RegExp][] = [
  ['policy', /\b(ship(ping)?|deliver|warrant|return|refund|exchange|tax|duty|customs|financ|assembl(y|e)|install)\b/i],
  ['parts', /\b(replac|spare|broken|torn|ripped|cracked|worn|missing|part|bolt|pad|repair)\b/i],
  // Dimensions is checked before compatibility on purpose: "will this fit my
  // 7ft ceiling" is a measurement question that happens to contain the word "fit".
  ['dimensions', /\b(tall|height|high|ceiling|dimension|footprint|wide|width|deep|depth|size|how big|space)\b/i],
  ['compatibility', /\b(fit|fits|compatible|compatibility|work with|attach|bolt on|go on|use with)\b/i],
  ['stock', /\b(in stock|stock|available|availability|back ?order|restock|when will)\b/i],
  ['price', /\b(price|cost|how much|pricing|\$)\b/i],
];

export function classify(q: string): Intent {
  for (const [intent, rx] of RX) if (rx.test(q)) return intent;
  return 'unknown';
}

/* ---------------- helpers ---------------- */

const isRack = (d: Doc) => d.hgb.some((t) => /_prebuilt$/.test(t)) || d.type === 'Power Rack';
const rackKey = (d: Doc): { fam: string; frame: string } | null => {
  const fam = /hydra/i.test(d.title) ? 'hydra' : /manticore/i.test(d.title) ? 'manticore' : null;
  if (!fam) return null;
  const frame =
    /roc foldable 4 post|folding power rack/i.test(d.title) ? 'folding_4post'
    : /roc foldable 2 post|folding half rack/i.test(d.title) ? 'folding_2post'
    : /six post/i.test(d.title) ? '6post'
    : /four post/i.test(d.title) ? '4post'
    : /collegiate/i.test(d.title) ? 'collegiate'
    : /flat foot/i.test(d.title) ? 'flat'
    : /half rack/i.test(d.title) ? 'half'
    : /squat stand/i.test(d.title) ? 'squatstand' : null;
  return frame ? { fam, frame } : null;
};
const HOLE: Record<string, string> = { hydra: '⅝"', manticore: '1"' };

const cite = (d: Doc, note: string): Citation => ({ title: d.title, url: d.url, note });

const ESCALATE = (intent: Intent, headline: string, reason: string, trace: string[], citations: Citation[] = []): Answer => ({
  intent, confidence: 'none', headline,
  body: [reason],
  citations, escalate: true, escalateReason: reason, trace,
});

/* ---------------- the engine ---------------- */

export function answer(q: string, ix: Index): Answer {
  const intent = classify(q);
  const hits = retrieve(q, ix);
  const trace = [
    `intent classified as "${intent}"`,
    hits.length
      ? `retrieved ${hits.length} candidate products, top match "${hits[0].doc.title}" (score ${hits[0].score.toFixed(1)})`
      : 'retrieved 0 products above the relevance threshold',
  ];

  if (intent === 'policy') {
    return ESCALATE('policy',
      'Routing to a human. This is outside the catalogue.',
      'Shipping, warranty, returns and assembly are policy questions. The product catalogue is the only source this tool is allowed to read, and it contains no policy data, so answering would mean inventing terms. That is the one thing a customer-facing assistant must never do.',
      [...trace, 'no policy source connected → escalate']);
  }

  if (!hits.length) {
    return ESCALATE(intent, 'No product matched, routing to a human.',
      'Nothing in the catalogue scored above the relevance threshold for this question, so there is nothing to ground an answer in.',
      trace);
  }

  const top = hits[0].doc;

  /* -------- compatibility -------- */
  if (intent === 'compatibility') {
    const rack = hits.find((h) => isRack(h.doc) && rackKey(h.doc));
    const attachment = hits.find((h) => !isRack(h.doc) && h.doc.id !== rack?.doc.id);

    if (!rack) {
      return ESCALATE('compatibility', 'Could not identify which rack this is about.',
        'A compatibility answer needs both sides, which rack, and which attachment. I could not resolve a specific rack model from the question, and guessing which one the customer owns is exactly how a wrong part gets shipped.',
        [...trace, 'rack entity unresolved → escalate'],
        hits.slice(0, 3).map((h) => cite(h.doc, 'candidate')));
    }
    if (!attachment) {
      return ESCALATE('compatibility', 'Could not identify which attachment this is about.',
        'I resolved the rack but not the attachment, so there is nothing to check against the compatibility graph.',
        [...trace, 'attachment entity unresolved → escalate'],
        [cite(rack.doc, 'rack identified')]);
    }

    const key = rackKey(rack.doc)!;
    const attTags = attachment.doc.hgb.filter((t) => /^hgb_(hydra|manticore)_/.test(t));
    trace.push(`rack resolved: ${key.fam} / ${key.frame}`);
    trace.push(`attachment carries ${attTags.length} family compatibility tag(s)`);

    if (!attTags.length) {
      return ESCALATE('compatibility', 'Compatibility is not published for this attachment.',
        `"${attachment.doc.title}" carries no rack compatibility tags in the catalogue at all, so there is no published answer to give. This needs someone who can check the physical spec.`,
        [...trace, 'no hgb_ tags on attachment → escalate'],
        [cite(rack.doc, 'rack'), cite(attachment.doc, 'attachment, no compatibility data')]);
    }

    const wanted = attTags.filter((t) => t.startsWith(`hgb_${key.fam}_${key.frame}_`));
    const otherFamily = attTags.some((t) => !t.startsWith(`hgb_${key.fam}_`));

    if (wanted.length) {
      return {
        intent: 'compatibility', confidence: 'high',
        headline: 'Yes. This attachment is tagged as compatible.',
        body: [
          `"${attachment.doc.title}" is listed as compatible with the ${rack.doc.title}.`,
          `Both are in the ${key.fam.replace(/^./, (c) => c.toUpperCase())} ${HOLE[key.fam]} hole pattern, and the catalogue carries the matching compatibility tag (${wanted[0]}) for this exact frame.`,
          attachment.doc.priceCents ? `The attachment is ${money(attachment.doc.priceCents)}${attachment.doc.available ? ' and currently in stock' : ', but currently out of stock'}.` : '',
        ].filter(Boolean),
        citations: [cite(rack.doc, 'rack'), cite(attachment.doc, `compatible, tag ${wanted[0]}`)],
        escalate: false,
        trace: [...trace, `matched tag ${wanted[0]} → compatible`],
      };
    }

    return {
      intent: 'compatibility', confidence: 'high',
      headline: 'No. These are not compatible.',
      body: [
        `"${attachment.doc.title}" is not tagged for the ${rack.doc.title}.`,
        otherFamily
          ? `It is built for the other rack family. Hydra uprights use ${HOLE.hydra} holes and Manticore uses ${HOLE.manticore}, so the hardware physically will not line up. This is not a case where it fits with some persuasion.`
          : `The catalogue lists compatibility for other frames in this family, but not for this one.`,
        `Bells of Steel's own product copy carries the same warning: only attachments made for that exact upright and hole size will fit.`,
      ],
      citations: [cite(rack.doc, `rack, ${HOLE[key.fam]} holes`), cite(attachment.doc, `tagged for: ${attTags.slice(0, 3).join(', ')}`)],
      escalate: false,
      trace: [...trace, `no tag for hgb_${key.fam}_${key.frame}_* → not compatible`],
    };
  }

  /* -------- dimensions -------- */
  if (intent === 'dimensions') {
    const ceil = q.match(/(\d(?:\.\d)?)\s*(?:ft|foot|feet|')/i);
    const ceilingIn = ceil ? Math.round(parseFloat(ceil[1]) * 12) : null;

    if (ceilingIn) {
      const racks = ix.docs.filter((d) => d.hgb.some((t) => /_prebuilt$/.test(t)));
      const fitting = racks.filter((d) => d.specs?.uprightHeightIn && d.specs.uprightHeightIn + 2 <= ceilingIn);
      const unknown = racks.filter((d) => !d.specs?.uprightHeightIn);
      trace.push(`ceiling parsed as ${ceilingIn}"`, `${fitting.length} racks clear it, ${unknown.length} have no published height`);
      const shortest = racks
        .filter((d) => d.specs?.uprightHeightIn)
        .sort((a, b) => a.specs.uprightHeightIn - b.specs.uprightHeightIn);

      if (!fitting.length) {
        return {
          intent: 'dimensions', confidence: 'high',
          headline: `None of the ${racks.length} rack models clear a ${ceil![1]}ft ceiling.`,
          body: [
            `At ${ceilingIn}" there is no prebuilt rack in the range that will stand up. The shortest uprights Bells of Steel sells are ${shortest[0]?.specs.uprightHeightIn}", and you need roughly 2" above that for the feet and pull-up bar hardware.`,
            `Worth confirming the measurement with the customer before saying no, people often quote the height to a joist or a duct rather than to the finished ceiling, and a few inches decides this.`,
            unknown.length ? `${unknown.length} rack models publish no height at all and could not be checked either way, the Residential line is the main gap, and it is the one most likely to suit a low room.` : '',
          ].filter(Boolean),
          citations: shortest.slice(0, 3).map((d) => cite(d, `${d.specs.uprightHeightIn}" uprights, still too tall`)),
          escalate: false, trace,
        };
      }

      return {
        intent: 'dimensions', confidence: 'high',
        headline: `${fitting.length} of ${racks.length} rack models clear a ${ceil![1]}ft ceiling.`,
        body: [
          `With ${ceilingIn}" to work with, these fit: ${fitting.slice(0, 6).map((d) => `${d.title.replace(/\s*\(.*\)$/, '')} (${d.specs.uprightHeightIn}" uprights)`).join('; ')}.`,
          `Allow about 2" above the uprights for the feet and pull-up bar hardware.`,
          unknown.length ? `Note for the rep: ${unknown.length} rack models publish no height at all, so they cannot be checked here, the Residential line is the main gap.` : '',
        ].filter(Boolean),
        citations: fitting.slice(0, 4).map((d) => cite(d, `${d.specs.uprightHeightIn}" uprights`)),
        escalate: false, trace,
      };
    }

    const h = top.specs?.uprightHeightIn;
    if (!h) {
      return ESCALATE('dimensions', 'That dimension is not published.',
        `The product page for "${top.title}" does not state a height anywhere in its copy, so there is no published figure to quote. Rather than estimate, this needs someone who can measure a unit or pull the spec sheet.`,
        [...trace, 'no dimension in source → escalate'],
        [cite(top, 'no dimensions published')]);
    }
    return {
      intent: 'dimensions', confidence: 'high',
      headline: `${top.title.replace(/\s*\(.*\)$/, '')} has ${h}" uprights.`,
      body: [
        `The uprights measure ${h}", so you want at least ${h + 2}" of ceiling to stand it up, and a little more to use the pull-up bar comfortably.`,
        top.specs.crossmemberIn ? `The crossmembers are ${top.specs.crossmemberIn}", making the frame roughly ${top.specs.crossmemberIn + 6}" wide overall.` : '',
      ].filter(Boolean),
      citations: [cite(top, 'dimensions from product copy')],
      escalate: false, trace,
    };
  }

  /* -------- price -------- */
  if (intent === 'price') {
    const dup = ix.dupPrices[top.title];
    if (dup) {
      const lo = Math.min(...dup.map((d) => d.priceCents));
      const hi = Math.max(...dup.map((d) => d.priceCents));
      trace.push(`WARNING: ${dup.length} live listings for this title at different prices`);
      return {
        intent: 'price', confidence: 'medium',
        headline: `Check before quoting. This product has two live prices.`,
        body: [
          `"${top.title}" exists as ${dup.length} separate product pages, currently priced ${money(lo)} and ${money(hi)}, a difference of ${money(hi - lo)}.`,
          `Confirm which page the customer is looking at before quoting, and flag it to whoever owns the catalogue. This affects every prebuilt rack, not just this one.`,
        ],
        citations: dup.map((d) => ({ title: `/${d.handle}`, url: d.url, note: money(d.priceCents) })),
        escalate: false, trace,
      };
    }
    return {
      intent: 'price', confidence: 'high',
      headline: `${top.title.replace(/\s*\(.*\)$/, '')} is ${money(top.priceCents)}${top.priceMaxCents && top.priceMaxCents !== top.priceCents ? ` to ${money(top.priceMaxCents)}` : ''}.`,
      body: [
        top.priceMaxCents && top.priceMaxCents !== top.priceCents
          ? `Price varies by variant, from ${money(top.priceCents)} to ${money(top.priceMaxCents)}.`
          : `Listed at ${money(top.priceCents)}.`,
        `Snapshot price. Confirm against the live page before committing to it with a customer.`,
      ],
      citations: [cite(top, money(top.priceCents))],
      escalate: false, trace,
    };
  }

  /* -------- stock -------- */
  if (intent === 'stock') {
    return {
      intent: 'stock', confidence: 'medium',
      headline: top.available ? `${top.title.replace(/\s*\(.*\)$/, '')} was in stock at snapshot.` : `${top.title.replace(/\s*\(.*\)$/, '')} was out of stock at snapshot.`,
      body: [
        top.available
          ? `At least one variant showed as available when this catalogue was captured.`
          : `Every variant showed as unavailable when this catalogue was captured.`,
        `Stock is the one field that goes stale fastest. Treat this as a hint and check live inventory before you tell a customer anything.`,
      ],
      citations: [cite(top, top.available ? 'available at snapshot' : 'unavailable at snapshot')],
      escalate: false, trace,
    };
  }

  /* -------- parts -------- */
  if (intent === 'parts') {
    const qt = tok(q);
    const scored = ix.parts
      .map((p) => {
        const hay = tok(`${p.name} ${p.machine}`);
        return { p, s: qt.reduce((acc, t) => acc + (hay.includes(t) ? (ix.idf[t] ?? 1.5) : 0), 0) };
      })
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4);

    trace.push(`searched ${ix.parts.length} spare parts, ${scored.length} matched`);
    if (!scored.length) {
      return ESCALATE('parts', 'No matching spare part is published.',
        `Nothing in the ${ix.parts.length} published spare parts matches that description. Sending a customer the wrong replacement part is worse than a short delay, so this goes to a human.`,
        [...trace, 'no part match → escalate']);
    }
    return {
      intent: 'parts', confidence: 'high',
      headline: `Yes, ${scored[0].p.name} is ${money(scored[0].p.priceCents)}.`,
      body: [
        `The closest match is ${scored[0].p.name} (SKU ${scored[0].p.sku}) for the ${scored[0].p.machine}, at ${money(scored[0].p.priceCents)}${scored[0].p.available ? '' : ', currently out of stock'}.`,
        scored.length > 1 ? `Other parts for the same machine: ${scored.slice(1).map((r) => `${r.p.name} (${money(r.p.priceCents)})`).join(', ')}.` : '',
        `Confirm the machine model with the customer before shipping, part names repeat across machines.`,
      ].filter(Boolean),
      citations: scored.map((r) => ({ title: `${r.p.name}, ${r.p.sku}`, url: r.p.url, note: money(r.p.priceCents) })),
      escalate: false, trace,
    };
  }

  /* -------- unknown -------- */
  return ESCALATE('unknown', 'Not confident enough to answer this one.',
    `I found products that look related, but the question does not map to something the catalogue can answer factually. Rather than produce a plausible-sounding reply, this goes to a human with the context attached.`,
    [...trace, 'intent unresolved → escalate'],
    hits.slice(0, 3).map((h) => cite(h.doc, 'possibly relevant')));
}
