export function cleanIdentityClaim(value: unknown, max = 64): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.replace(/[\p{Cc}\u061c\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/gu, "").trim();
  return Array.from(clean).slice(0, max).join("").trim() || undefined;
}
