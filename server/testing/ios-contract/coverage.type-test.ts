import type { SettingsPageId } from "../../../src/state/store.tsx";
import type { WireMessage } from "../../../shared/wire.ts";
import { settingsPages, wireMessageFields, wireMessageKinds, type IosStatus } from "./coverage.ts";

const { replyToId: omittedField, ...allOtherFields } = wireMessageFields;
// @ts-expect-error A complete field Record missing only replyToId must fail.
const missingField: Record<keyof WireMessage, IosStatus> = allOtherFields;
const { text: omittedKind, ...allOtherKinds } = wireMessageKinds;
// @ts-expect-error A complete Record missing only text must fail.
const missingKind: Record<WireMessage["kind"], IosStatus> = allOtherKinds;
const { overview: omittedPage, ...allOtherPages } = settingsPages;
// @ts-expect-error A complete Record missing only overview must fail.
const missingPage: Record<SettingsPageId, IosStatus> = allOtherPages;
// @ts-expect-error A new web kind requires a new coverage entry.
const addedKind: Record<WireMessage["kind"] | "contract-new", IosStatus> = wireMessageKinds;
// @ts-expect-error A new settings page requires a new coverage entry.
const addedPage: Record<SettingsPageId | "contract-new", IosStatus> = settingsPages;
void [omittedField, missingField, omittedKind, omittedPage, missingKind, missingPage, addedKind, addedPage];
