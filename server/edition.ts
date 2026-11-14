export function editionStatus(): { edition: "oss"; features: string[] } {
  return { edition: "oss", features: [] };
}

export const editionForSettings = editionStatus;

export function entitled(_feature: string): boolean {
  return false;
}
