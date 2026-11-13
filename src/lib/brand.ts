export interface Brand {
  name: string;
  logo?: string;
  supportUrl?: string;
  tagline?: string;
}

export interface BrandStatus {
  brand: Brand;
  source: "default" | "file";
  file: string;
}

export const PRODUCT_NAME = "Cry Bot";
export const DEFAULT_BRAND: Brand = Object.freeze({ name: PRODUCT_NAME });
const status: BrandStatus = Object.freeze({ brand: DEFAULT_BRAND, source: "default", file: "" });

export function brand(): Brand { return DEFAULT_BRAND; }
export function productName(): string { return PRODUCT_NAME; }
export function brandStatus(): BrandStatus { return status; }

export async function bootstrapBrand(): Promise<BrandStatus> {
  if (typeof document !== "undefined") document.title = PRODUCT_NAME;
  return status;
}

const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

export function luminance(hex: string): number {
  const m = HEX.exec(hex);
  if (!m) return 0;
  const channel = (h: string) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(m[1]) + 0.7152 * channel(m[2]) + 0.0722 * channel(m[3]);
}

export function accentInk(accent: string): string {
  // contrast vs white = 1.05 / (L + 0.05); vs black = (L + 0.05) / 0.05
  const l = luminance(accent);
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.05 ? "#ffffff" : "#111111";
}
