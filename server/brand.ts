export const DEFAULT_BRAND = { name: "Cry Bot" };
export const PRODUCT_NAME = "Cry Bot";

export function loadBrand() {
  return { brand: DEFAULT_BRAND, source: "default" as const };
}

export function describeBrand(_status = loadBrand()): string {
  return "brand: Cry Bot";
}

export function productName(): string {
  return PRODUCT_NAME;
}
