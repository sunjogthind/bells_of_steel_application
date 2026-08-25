export type Variant = {
  id: number; title: string; sku: string | null;
  priceCents: number; available: boolean; grams: number;
};

export type Specs = {
  tubing?: string; holeSize?: string;
  uprightHeightIn?: number; crossmemberIn?: number; depthIn?: number;
};

export type Product = {
  id: number; handle: string; title: string; url: string;
  type: string | null; derivedType: string | null;
  family: string | null;
  vendor: string | null; vendorSuspect: boolean;
  tags: string[]; hgb: string[];
  priceMinCents: number | null; priceMaxCents: number | null;
  available: boolean;
  variants: Variant[];
  image: string | null; imageCount: number;
  specs: Specs;
  text: string;
  flags: string[];
};

export type Catalog = {
  fetched_at: string; source: string; count: number; products: Product[];
};
