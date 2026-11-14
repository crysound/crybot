import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudAccountState, CloudPlanSnapshot } from "../../electron/cloud-account-types.mjs";
import { setLocale } from "./i18n";
import {
  cloudIntroView, cloudNoticeKind, cloudPlanLabel, cloudPlanLine, cloudPlanView,
  cloudTrialNotice, moneyBackLine, offerTrialDays, xResearchAction,
} from "./cloud-status";

beforeEach(() => { setLocale("en"); });

describe("cloud status without a hosted service", () => {
  it.each([
    ["local desktop without an account bridge", undefined],
    ["server without an account snapshot", null],
    ["restore still pending", { status: "signed-out", message: "restoring" }],
  ] as const)("%s has an unknown plan and no notice", (_name, account) => {
    const view = cloudPlanView(account);
    expect(view).toEqual({ kind: "unknown" });
    expect(cloudPlanLine(view)).toBeNull();
    expect(cloudNoticeKind(view, account)).toBeNull();
    expect(xResearchAction(view)).toBeNull();
  });

  it.each([
    ["unavailable", { available: false, status: "unavailable", message: "disabled" }],
    ["future status", { status: "future-status" }],
    ["missing status", {}],
  ])("%s does not claim a verified plan", (_name, input) => {
    const account = input as CloudAccountState;
    const view = cloudPlanView(account);
    expect(view).toEqual({ kind: "unverified", label: null });
    expect(cloudPlanLine(view)).toBeNull();
    expect(cloudNoticeKind(view, account)).toBeNull();
    expect(xResearchAction(view)).toBeNull();
  });

  it("keeps a remembered plan unverified while the service is disabled", () => {
    const account: CloudAccountState = { status: "unavailable", lastPlan: { tier: "max", active: true } };
    const view = cloudPlanView(account);
    expect(view).toEqual({ kind: "unverified", label: "Max" });
    expect(cloudNoticeKind(view, account)).toBeNull();
    expect(xResearchAction(view)).toBeNull();
  });

  it.each([undefined, null, { status: "none" }, { status: "signin" }, { status: "paid" }])(
    "does not infer a trial notice from %j", input => {
      expect(cloudTrialNotice(input as CloudPlanSnapshot | null | undefined)).toBeNull();
    },
  );

  it("has no offer, trial price or refund promise without a catalog", () => {
    for (const offer of [undefined, null]) {
      expect(cloudIntroView(offer)).toBeNull();
      expect(offerTrialDays(offer)).toBeNull();
      expect(moneyBackLine(offer)).toBeNull();
    }
    expect(xResearchAction(null)).toBeNull();
  });

  it("uses a neutral label for unknown or inherited tier names", () => {
    for (const tier of ["future-plan", "__proto__", "constructor", "toString", ""]) expect(cloudPlanLabel(tier)).toBe("Cloud");
  });

  it("computes disabled states without consulting a network or desktop bridge", () => {
    const fetch = vi.fn(() => { throw new Error("unexpected network request"); });
    vi.stubGlobal("fetch", fetch);
    try {
      expect(cloudPlanView(undefined)).toEqual({ kind: "unknown" });
      expect(cloudPlanView({ status: "unavailable" })).toEqual({ kind: "unverified", label: null });
      expect(fetch).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
});

it.each([
  [{ status: "signed-out" }, { kind: "signed-out" }],
  [{ status: "signed-out", message: "restore-removed" }, { kind: "removed" }],
  [{ status: "connecting" }, { kind: "connecting" }],
  [{ status: "reauth-required", message: "expired", lastPlan: { tier: "pro", active: true } }, { kind: "reauth", label: "Pro", reason: "expired" }],
  [{ status: "reauth-required" }, { kind: "reauth", label: null, reason: "access-ended" }],
  [{ status: "connected" }, { kind: "free" }],
] as const)("preserves the status distinction for saved state %j", (account, expected) => {
  expect(cloudPlanView(account)).toEqual(expected);
});
