import type { WireMessage } from "../../../shared/wire.ts";
import type { IosStatus } from "./coverage.ts";

// A newly added WireMessage key makes this intentionally incomplete assignment fail in tsc.
// @ts-expect-error Record<keyof WireMessage, IosStatus> must be exhaustive.
const missingWireMessageKey: Record<keyof WireMessage, IosStatus> = { id: { ios: "done" } };
void missingWireMessageKey;
