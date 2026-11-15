export function replaceFixtureSource(source: string, search: string, replacement: string): string {
  if (!source.includes(search)) throw new Error(`Fixture source replacement did not match: ${search}`);
  return source.replace(search, replacement);
}
