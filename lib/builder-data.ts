import { allProducts, prebuiltRacks } from './catalog';
import { toRackModel, compatibleAttachments } from './fit';
import type { Dimension } from './fit';
import type { Product } from './types';

export type Slim = {
  id: number; title: string; url: string; image: string | null;
  priceCents: number | null; available: boolean; kind: string;
};

const slim = (p: Product, kind: string): Slim => ({
  id: p.id, title: p.title, url: p.url, image: p.image,
  priceCents: p.priceMinCents, available: p.available, kind,
});

export type RackPayload = {
  id: number; title: string; url: string; image: string | null;
  priceCents: number | null; available: boolean;
  family: string; frame: string | null; frameLabel: string;
  holePattern: string | null; tubing: string | null;
  height: Dimension; width: Dimension; depth: Dimension;
  attachments: Record<string, number[]>;
};

/** Kit components, taken from the categories Bells of Steel already curates with hgb_ tags. */
const KIT_GROUPS: [string, string[]][] = [
  ['Barbell', ['hgb_olympic_bars']],
  ['Specialty bar', ['hgb_specialty_bars', 'hgb_ez_curl']],
  ['Plates', ['hgb_all_black_bumper', 'hgb_dead_bounce_bumpers', 'hgb_mighty_grip_iron_plates', 'hgb_machined_iron_plates', 'hgb_urethane_bumpers', 'hgb_calibrated_plates']],
  ['Bench', ['hgb_adjustable_bench', 'hgb_flat']],
  ['Flooring', ['hgb_flooring']],
  ['Storage', ['hgb_storage']],
  ['Conditioning', ['hgb_cardio_machine']],
  ['Accessories', ['hgb_accessories']],
];

export function builderPayload() {
  const all = allProducts();
  const racks = prebuiltRacks().map(toRackModel);

  const lookup: Record<number, Slim> = {};

  const rackPayload: RackPayload[] = racks.map((r) => {
    const att = compatibleAttachments(r, all);
    const attachments: Record<string, number[]> = {};
    Object.entries(att).forEach(([kind, list]) => {
      list.forEach((p) => (lookup[p.id] = slim(p, `${kind} attachment`)));
      attachments[kind] = list.map((p) => p.id);
    });
    return {
      id: r.product.id, title: r.product.title, url: r.product.url, image: r.product.image,
      priceCents: r.priceCents, available: r.product.available,
      family: r.family, frame: r.frame, frameLabel: r.frameLabel,
      holePattern: r.holePattern, tubing: r.product.specs.tubing ?? null,
      height: r.height, width: r.width, depth: r.depth,
      attachments,
    };
  });

  const kit: { group: string; items: Slim[] }[] = KIT_GROUPS.map(([group, tags]) => {
    const items = all
      .filter((p) => p.hgb.some((t) => tags.includes(t)) && p.available && p.priceMinCents)
      .sort((a, b) => (a.priceMinCents ?? 0) - (b.priceMinCents ?? 0))
      .map((p) => slim(p, group));
    items.forEach((i) => (lookup[i.id] = i));
    return { group, items };
  }).filter((g) => g.items.length > 0);

  return { racks: rackPayload, kit, lookup };
}
