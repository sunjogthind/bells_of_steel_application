import raw from '@/data/catalog.json';
import type { Catalog, Product } from './types';

const catalog = raw as unknown as Catalog;

export const SNAPSHOT_DATE = '25 August 2026';
export const getCatalog = () => catalog;
export const allProducts = (): Product[] => catalog.products;

export const money = (cents: number | null) =>
  cents == null ? '—' : `$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const typeOf = (p: Product) => p.type && p.type !== 'Hidden' ? p.type : p.derivedType;

/** The 20 rack models Bells of Steel tags as prebuilt, keyed into their own hgb_ graph. */
export const prebuiltRacks = () => allProducts().filter((p) => p.hgb.some((t) => /_prebuilt$/.test(t)));

export const catalogStats = () => {
  const p = allProducts();
  const hgbTags = new Set(p.flatMap((x) => x.hgb));
  return {
    products: p.length,
    variants: p.reduce((s, x) => s + x.variants.length, 0),
    hgbTags: hgbTags.size,
    racks: prebuiltRacks().length,
    flagged: p.filter((x) => x.flags.length > 0).length,
    fetchedAt: catalog.fetched_at,
  };
};
