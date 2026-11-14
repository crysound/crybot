import { readManualFixtures, type ManualFixture } from "../fixtures.ts";

export type ContractArea = { name: string; swiftType: string; value: unknown };

export function collect(): ContractArea[] {
  return readManualFixtures().map(({ name, swiftType, value }: ManualFixture) => ({ name, swiftType, value }));
}
