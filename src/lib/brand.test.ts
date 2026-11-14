import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { bootstrapBrand, brand, productName, PRODUCT_NAME } from "./brand";

it("uses the fixed product identity without requesting a brand file", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  try {
    expect(await bootstrapBrand()).toMatchObject({ source: "default", brand: { name: "Cry Bot" } });
    expect(brand().name).toBe("Cry Bot");
    expect(productName()).toBe("Cry Bot");
    expect(fetch).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});

it.each(["index.html", "rail.html"])("%s starts with the product title", (page) => {
  expect(readFileSync(new URL(`../../${page}`, import.meta.url), "utf8")).toContain(`<title>${PRODUCT_NAME}</title>`);
});
