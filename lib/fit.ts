import type { Product } from './types';

/* ------------------------------------------------------------------ *
 * Fit engine.
 *
 * Every number this produces is tagged with where it came from:
 *   'copy'      - parsed out of the product description on bellsofsteel.com
 *   'estimated' - derived by us from frame geometry, clearly not authoritative
 *   'unknown'   - the product page does not publish it, so we refuse to guess
 *
 * The 'unknown' path matters more than the other two. A fit tool that
 * invents a ceiling height is worse than no fit tool at all.
 * ------------------------------------------------------------------ */

export type Provenance = 'copy' | 'estimated' | 'unknown';
export type Verdict = 'fits' | 'tight' | 'no' | 'unknown';

export type Dimension = { value: number | null; source: Provenance; note?: string };

export type RackModel = {
  product: Product;
  family: 'Hydra' | 'Manticore' | 'Residential' | 'Other';
  frame: string | null;          // 4post, 6post, half, squatstand, collegiate, flat, folding_2post, folding_4post
  frameLabel: string;
  holePattern: string | null;    // 5/8" or 1"
  height: Dimension;
  width: Dimension;
  depth: Dimension;
  priceCents: number | null;
};

const FRAME_RULES: [RegExp, string, string][] = [
  [/roc foldable 4 post|folding power rack/i, 'folding_4post', 'Folding 4-post'],
  [/roc foldable 2 post|folding half rack|folding rack/i, 'folding_2post', 'Folding 2-post'],
  [/six post/i, '6post', '6-post'],
  [/four post/i, '4post', '4-post'],
  [/collegiate/i, 'collegiate', 'Collegiate'],
  [/flat foot/i, 'flat', 'Flat-foot'],
  [/half rack/i, 'half', 'Half rack'],
  [/squat stand/i, 'squatstand', 'Squat stand'],
];

/** Assembled depth, inches. Estimated from frame geometry - never presented as spec. */
const DEPTH_ESTIMATE: Record<string, number> = {
  '4post': 49, '6post': 73, collegiate: 49, flat: 53,
  folding_4post: 36, folding_2post: 22, half: 54, squatstand: 48,
};

const TUBING_IN = (tubing?: string) => {
  const m = tubing?.match(/^([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
};

export function toRackModel(p: Product): RackModel {
  const family: RackModel['family'] =
    p.hgb.includes('hgb_hydra_prebuilt') ? 'Hydra'
    : p.hgb.includes('hgb_manticore_prebuilt') ? 'Manticore'
    : p.hgb.includes('hgb_residential_prebuilt') ? 'Residential'
    : 'Other';

  const rule = FRAME_RULES.find(([re]) => re.test(p.title));
  const frame = rule ? rule[1] : null;
  const frameLabel = rule ? rule[2] : 'Rack';

  const height: Dimension = p.specs.uprightHeightIn
    ? { value: p.specs.uprightHeightIn, source: 'copy', note: `${p.specs.uprightHeightIn}" uprights, stated in the product description` }
    : { value: null, source: 'unknown', note: 'This product page does not publish an upright height.' };

  const tube = TUBING_IN(p.specs.tubing);
  const width: Dimension = p.specs.crossmemberIn && tube
    ? { value: Math.round(p.specs.crossmemberIn + tube * 2), source: 'copy',
        note: `${p.specs.crossmemberIn}" crossmember + two ${p.specs.tubing?.split(' ')[0]} uprights` }
    : { value: null, source: 'unknown', note: 'No crossmember width published for this product.' };

  const depth: Dimension = frame && DEPTH_ESTIMATE[frame]
    ? { value: DEPTH_ESTIMATE[frame], source: 'estimated', note: `Typical assembled depth for a ${frameLabel.toLowerCase()} frame. Estimated by this tool, not a published spec.` }
    : { value: null, source: 'unknown', note: 'Frame geometry unknown, so depth cannot be estimated.' };

  return {
    product: p, family, frame, frameLabel,
    holePattern: p.specs.holeSize ? `${p.specs.holeSize}"` : null,
    height, width, depth, priceCents: p.priceMinCents,
  };
}

export type Room = { ceilingIn: number; widthIn: number; depthIn: number; usesBarbell: boolean };

export type Check = {
  label: string; verdict: Verdict; detail: string;
  need: string; have: string; source: Provenance;
};

/** A 7ft Olympic barbell is 86" end to end - the constraint people forget. */
export const BARBELL_LENGTH_IN = 86;
const CEILING_HARDWARE_IN = 2;   // feet + pull-up bar hardware above the uprights
const COMFORT_HEADROOM_IN = 4;   // enough to actually use the pull-up bar
const ACCESS_IN = 12;            // walkway around the frame

/** Minimal geometry the checker needs - lets the same code run on server and client. */
export type Geometry = {
  frameLabel: string;
  height: Dimension; width: Dimension; depth: Dimension;
};

export function checkFit(rack: Geometry, room: Room): { checks: Check[]; verdict: Verdict } {
  const checks: Check[] = [];

  // 1. Ceiling
  if (rack.height.value == null) {
    checks.push({
      label: 'Ceiling clearance', verdict: 'unknown', source: 'unknown',
      need: 'not published', have: `${room.ceilingIn}"`,
      detail: 'Bells of Steel does not publish an upright height for this rack, so this tool will not tell you whether it clears your ceiling. Ask their team before ordering.',
    });
  } else {
    const min = rack.height.value + CEILING_HARDWARE_IN;
    const comfy = rack.height.value + COMFORT_HEADROOM_IN;
    const verdict: Verdict = room.ceilingIn < min ? 'no' : room.ceilingIn < comfy ? 'tight' : 'fits';
    checks.push({
      label: 'Ceiling clearance', verdict, source: 'copy',
      need: `${min}"`, have: `${room.ceilingIn}"`,
      detail: verdict === 'no'
        ? `The uprights alone are ${rack.height.value}". This rack will not stand up in your room.`
        : verdict === 'tight'
        ? `It stands, with ${room.ceilingIn - rack.height.value}" to spare. Enough to assemble, not enough to use the pull-up bar comfortably.`
        : `${room.ceilingIn - rack.height.value}" of clearance above the uprights.`,
    });
  }

  // 2. Room width
  if (rack.width.value == null) {
    checks.push({
      label: 'Floor width', verdict: 'unknown', source: 'unknown',
      need: 'not published', have: `${room.widthIn}"`,
      detail: 'No crossmember width is published for this rack, so its footprint cannot be verified.',
    });
  } else {
    const min = rack.width.value + ACCESS_IN;
    const verdict: Verdict = room.widthIn < rack.width.value ? 'no' : room.widthIn < min ? 'tight' : 'fits';
    checks.push({
      label: 'Floor width', verdict, source: 'copy',
      need: `${min}"`, have: `${room.widthIn}"`,
      detail: verdict === 'no'
        ? `The frame is ${rack.width.value}" wide. It does not physically fit across your room.`
        : verdict === 'tight'
        ? `Fits, but with under ${ACCESS_IN}" total to walk around it.`
        : `${room.widthIn - rack.width.value}" of width left over for access.`,
    });
  }

  // 3. Room depth (estimated - say so)
  if (rack.depth.value == null) {
    checks.push({
      label: 'Floor depth', verdict: 'unknown', source: 'unknown',
      need: 'unknown', have: `${room.depthIn}"`,
      detail: 'Frame geometry is unknown for this product, so depth cannot be estimated.',
    });
  } else {
    const min = rack.depth.value + ACCESS_IN;
    const verdict: Verdict = room.depthIn < rack.depth.value ? 'no' : room.depthIn < min ? 'tight' : 'fits';
    checks.push({
      label: 'Floor depth', verdict, source: 'estimated',
      need: `~${min}"`, have: `${room.depthIn}"`,
      detail: `Based on an estimated ${rack.depth.value}" assembled depth for a ${rack.frameLabel.toLowerCase()} frame. This one is our estimate, not a published spec - confirm before you buy.`,
    });
  }

  // 4. Barbell swing room
  if (room.usesBarbell) {
    const min = BARBELL_LENGTH_IN + 6;
    const verdict: Verdict = room.widthIn < BARBELL_LENGTH_IN ? 'no' : room.widthIn < min ? 'tight' : 'fits';
    checks.push({
      label: 'Barbell room', verdict, source: 'estimated',
      need: `${min}"`, have: `${room.widthIn}"`,
      detail: verdict === 'no'
        ? `A 7ft Olympic bar is ${BARBELL_LENGTH_IN}" end to end and will not fit across your room at all.`
        : verdict === 'tight'
        ? `A 7ft bar is ${BARBELL_LENGTH_IN}" long. It fits, but loading plates will be awkward.`
        : `Room for a 7ft bar plus space to load plates on both ends.`,
    });
  }

  const order: Verdict[] = ['no', 'unknown', 'tight', 'fits'];
  const verdict = order.find((v) => checks.some((c) => c.verdict === v)) ?? 'fits';
  return { checks, verdict };
}

/** The attachment classes Bells of Steel uses in their hgb_ tag scheme. */
export const ATTACHMENT_CLASSES = ['strength', 'storage', 'lat', 'smith', 'kraken'] as const;
export type AttachmentClass = (typeof ATTACHMENT_CLASSES)[number];

/** Attachments Bells of Steel's own hgb_ tags say bolt onto this rack. */
export function compatibleAttachments(rack: RackModel, all: Product[]) {
  const empty = { strength: [], storage: [], lat: [], smith: [], kraken: [] } as Record<AttachmentClass, Product[]>;
  if (!rack.frame || rack.family === 'Residential' || rack.family === 'Other') return empty;
  const fam = rack.family.toLowerCase();
  const out = { ...empty };
  ATTACHMENT_CLASSES.forEach((kind) => {
    out[kind] = all.filter((p) => p.hgb.includes(`hgb_${fam}_${rack.frame}_${kind}`));
  });
  return out;
}
