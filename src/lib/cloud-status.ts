import type { CloudAccountState, CloudPlanSnapshot } from "../../electron/cloud-account-types.mjs";
import type { CloudCredit, CloudOffer, CloudOfferPlan, CloudTrial, CloudTrialState } from "../../electron/cloud-home.mjs";
import { activeLocale, t } from "@/lib/i18n";

const PLAN_LABEL: Record<string, string> = { starter: "Starter", personal: "Personal", pro: "Pro", max: "Max" };
const CHEAPEST_FIRST: readonly string[] = ["starter", "personal", "pro", "max"];
function switchesDown(tier: string | undefined, target: string): boolean {
  const below = CHEAPEST_FIRST.indexOf(target);
  return tier !== undefined && below >= 0 && CHEAPEST_FIRST.indexOf(tier) > below;
}
export function cloudPlanLabel(tier?: string): string {
  return tier === undefined ? "Pro" : Object.hasOwn(PLAN_LABEL, tier) ? PLAN_LABEL[tier] : "Cloud";
}

export type CloudPlanView =
  | { kind: "unknown" }
  | { kind: "signed-out" }
  | { kind: "removed" }
  | { kind: "connecting" }
  | { kind: "free"; invited?: true }
  | { kind: "paid"; label: string; checking: boolean; trial?: true }
  | { kind: "attention"; label: string | null }
  | { kind: "purchase"; label: string | null; paidAt?: number }
  | { kind: "unverified"; label: string | null }
  | { kind: "reauth"; label: string | null; reason: "expired" | "access-ended" };

export function cloudPlanView(account: CloudAccountState | null | undefined): CloudPlanView {
  if (!account || (account.status === "signed-out" && account.message === "restoring")) return { kind: "unknown" };
  const last = account.lastPlan ? cloudPlanLabel(account.lastPlan.tier) : null;
  if (account.status === "signed-out") return account.message === "restore-removed" ? { kind: "removed" } : { kind: "signed-out" };
  if (account.status === "connecting") return { kind: "connecting" };
  if (account.status === "reauth-required") return { kind: "reauth", label: last, reason: account.message === "expired" ? "expired" : "access-ended" };
  if (account.status !== "connected") return { kind: "unverified", label: last };
  const entitlement = account.entitlement;
  if (entitlement?.plan === "pro" && entitlement.status === "active") {
    return { kind: "paid", label: cloudPlanLabel(entitlement.tier), checking: account.checking === true, ...(trialRunning(account.trial) ? { trial: true as const } : {}) };
  }
  if (account.purchase) {
    return { kind: "purchase", label: account.purchase.tier ? cloudPlanLabel(account.purchase.tier) : null, ...(account.purchase.paidAt ? { paidAt: account.purchase.paidAt } : {}) };
  }
  if (entitlement?.plan === "pro") return { kind: "attention", label: cloudPlanLabel(entitlement.tier) };
  if (account.machine) return { kind: "attention", label: null };
  // Invited into a team, with no Cloud of their own: their team comes first, and no plan is pushed at them.
  return account.landing ? { kind: "free", invited: true } : { kind: "free" };
}

export function buyOfferAllowed(view: CloudPlanView): boolean {
  return view.kind === "signed-out" || (view.kind === "free" && !view.invited);
}

/** What the X research card offers someone whose server has no plan credential yet: a paying desktop is still connecting
 * it; signed out (or a sign-in that ended), sign in; verified free, get a plan. Nothing where the state is unknown or
 * someone may already pay, and without a desktop bridge. */
export function xResearchAction(view: CloudPlanView | null): "connecting" | "sign-in" | "get-pro" | null {
  if (!view) return null;
  if (view.kind === "paid") return "connecting";
  if (view.kind === "signed-out" || view.kind === "reauth") return "sign-in";
  return view.kind === "free" ? "get-pro" : null;
}

export function cloudPlanLine(view: CloudPlanView): string | null {
  switch (view.kind) {
    case "paid": return t(view.trial ? "cloudAccount.trialPlan" : "cloudAccount.pro", { plan: view.label });
    case "attention": return t("cloudAccount.inactive", { plan: view.label ?? "Cry Bot Cloud" });
    case "purchase": return t("cloudAccount.purchaseReceived", { plan: view.label ?? "Cry Bot Cloud" });
    case "unverified": return view.label ? t("cloudAccount.lastPlan", { plan: view.label }) : null;
    case "reauth": return view.label ? t("cloudAccount.planName", { plan: view.label }) : null;
    case "free": return t("cloudAccount.free");
    default: return null;
  }
}

export function trialRunning(trial: CloudTrial | undefined): boolean {
  return trial?.state === "active" || trial?.state === "ending" || trial?.state === "processing";
}

const shortDate = (value: number) => new Intl.DateTimeFormat(activeLocale(), { day: "numeric", month: "short" }).format(new Date(value));

export function usd(dollars: number): string {
  const cents = Math.round(dollars * 100);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

export type CloudTrialAction = "manage" | "subscribe" | "status";
export interface CloudTrialView {
  state: CloudTrialState;
  title: string;
  body: string;
  credit?: string;
  switchPlan?: string;
  action: { kind: CloudTrialAction; label: string } | null;
}

export function cloudTrialView(trial: CloudTrial, credit?: CloudCredit): CloudTrialView {
  const switchTo = trial.switchTo ?? (trial.personalAmount ? { tier: "personal", amount: trial.personalAmount } : null);
  const plan = trial.tier ? cloudPlanLabel(trial.tier) : t("cloudTrial.yourPlan");
  const ends = shortDate(trial.endsAt), deleted = trial.deleteAt ? shortDate(trial.deleteAt) : null;
  const subscribe = { kind: "subscribe" as const, label: t("cloudTrial.subscribe") };
  switch (trial.state) {
    case "active": return {
      state: "active", title: t("cloudTrial.endsOn", { date: ends }),
      body: trial.amount === null ? t("cloudTrial.activeNoPrice", { plan, date: shortDate(trial.chargeAt ?? trial.endsAt) })
        : t("cloudTrial.active", { plan, price: usd(trial.amount / 100), date: shortDate(trial.chargeAt ?? trial.endsAt) }),
      ...(credit?.state === "active" ? { credit: t("cloudTrial.credit", { granted: usd(credit.grantedUsd), left: usd(credit.remainingUsd) }) } : {}),
      ...(switchTo && switchesDown(trial.tier, switchTo.tier)
        ? { switchPlan: t("cloudTrial.preferPlan", { plan: cloudPlanLabel(switchTo.tier), price: usd(switchTo.amount / 100), date: ends }) } : {}),
      action: { kind: "manage", label: t("cloudTrial.manage") },
    };
    case "ending": return trial.keep === "portal"
      ? { state: "ending", title: t("cloudTrial.endsOn", { date: ends }),
        body: deleted ? t("cloudTrial.ending", { date: deleted }) : t("cloudTrial.endingNoDate"), action: subscribe }
      : { state: "ending", title: t("cloudTrial.endsOn", { date: ends }),
        body: deleted ? t("cloudTrial.cancelled", { date: deleted }) : t("cloudTrial.cancelledNoDate"), action: null };
    case "processing": return { state: "processing", title: t("cloudTrial.processingTitle"), body: t("cloudTrial.processing"), action: null };
    case "late": return { state: "late", title: t("cloudTrial.lateTitle"),
      body: deleted ? t("cloudTrial.late", { date: deleted }) : t("cloudTrial.lateNoDate"), action: { kind: "status", label: t("cloudTrial.checkPayment") } };
    case "ended": return { state: "ended", title: t("cloudTrial.endedTitle"),
      body: deleted ? t("cloudTrial.ended", { date: deleted }) : t("cloudTrial.endedNoDate"), action: subscribe };
  }
}

export function cloudTrialNotice(plan: CloudPlanSnapshot | null | undefined): CloudTrialView | null {
  if (!plan?.notice || !plan.trial || plan.trial.state !== plan.notice) return null;
  return cloudTrialView(plan.trial, plan.credit);
}

export function cloudCreditLine(credit: CloudCredit): string {
  return credit.state === "used_up"
    ? t("cloudCredit.usedUp", { granted: usd(credit.grantedUsd) })
    : t("cloudCredit.left", { left: usd(credit.remainingUsd), granted: usd(credit.grantedUsd) });
}


export type CloudNoticeKind = "sign-in-again" | "removed";
export function cloudNoticeKind(view: CloudPlanView, account: CloudAccountState | null | undefined): CloudNoticeKind | null {
  if (view.kind === "reauth" && account?.lastPlan?.active === true) return "sign-in-again";
  if (view.kind === "removed") return "removed";
  return null;
}


export const CLOUD_SOURCES = ["app_card", "app_howto", "app_menu", "app_settings", "app_routines", "app_pages", "app_whats_new_pro", "app_whats_new_team", "app_onboarding"] as const;
export type CloudSource = (typeof CLOUD_SOURCES)[number];

export function offerPlan(offer: CloudOffer, chosen?: string | null): CloudOfferPlan {
  return offer.plans.find(plan => plan.tier === chosen) ?? offer.plans.find(plan => plan.tier === offer.recommended) ?? offer.plans[0]!;
}

export function offerTrialDays(offer: CloudOffer | null | undefined): number | null {
  if (!offer) return null;
  return offerPlan(offer).trialDays ?? offer.plans.find(plan => plan.trialDays)?.trialDays ?? null;
}

export function moneyBackLine(offer: CloudOffer | null | undefined): string | null {
  return offer?.refundDays ? t("cloudAdd.moneyBack", { days: offer.refundDays }) : null;
}

export function cloudIntroView(offer: CloudOffer | null | undefined): { badge: string; points: string[]; price: string; moneyBack: string | null } | null {
  const days = offerTrialDays(offer);
  if (!offer || !days) return null;
  const cheapest = Math.min(...offer.plans.filter(plan => plan.trialDays).map(plan => plan.amount));
  return {
    badge: days === 1 ? t("cloudIntro.badge.one") : t("cloudIntro.badge.many", { days }),
    points: [t("cloudIntro.routines"), t("cloudIntro.phone"), offer.creditUsd ? t("cloudIntro.credit", { credit: usd(offer.creditUsd) }) : t("cloudIntro.included")],
    price: t("cloudIntro.price", { price: usd(cheapest / 100) }),
    moneyBack: moneyBackLine(offer),
  };
}


