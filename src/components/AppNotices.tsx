import { useEffect, useState } from "react";
import type { CloudAccountState } from "../../electron/cloud-account-types.mjs";
import { api, useStore } from "@/state/store";
import { appVersion } from "@/lib/app-links";

import { announcementConditions, announcementPlan, announcementPlatform, announcementSurface, markLaunchAnnouncement, pickAnnouncement, providersRestricted, rememberCardSeen, rememberSponsorDay,
  reportAnnouncement, SPONSOR_CARDS_FOR_TEAM_MEMBERS, useAnnouncementCards, type SeenRecord } from "@/lib/announcements";

import { brandStatus } from "@/lib/brand";
import { cloudNoticeKind, cloudPlanView, cloudTrialNotice, cloudTrialView } from "@/lib/cloud-status";
import { jobRoutine, useCloudIntent } from "@/lib/cloud-intent";
import { CLOUD_INTENT_GIVEN, cloudSetupStage } from "@/lib/cloud-setup";
import { cornerPopupWaits, firstChatQuiet, firstReplyPending } from "@/lib/corner-popup";
import { ANNOUNCEMENT_NOTICE, CLOUD_NOTICE, CLOUD_TRIAL_NOTICE, dismissNotice, dismissNotices, GROK_MOVE_NOTICE, launchNotice, markLaunchNotice, nextNotice, noticeSeen, PHONE_UPDATE_NOTICE, phoneUpdateHint, SIMPLE_MODE_NOTICE, TWO_PLACES_NOTICE, UPDATES_CONSENT_NOTICE, usedBefore } from "@/lib/notices";
import { useTwoPlaces } from "@/lib/two-places";
import { SIMPLE_ONLY } from "@/lib/simple-only";
import { useAdvancedBackDue, useNewLookDue } from "@/lib/new-look";
import { useAdvancedMode } from "@/lib/interface-mode";
import { useSimpleModePromptSeen } from "@/lib/simple-mode-prompt";
import { cloudSignInDue, welcomeFinishedThisLaunch, type WelcomeViewer } from "@/lib/onboarding";
import { launchDialogShown, markLaunchDialog } from "@/lib/launch-dialogs";
import { useUpdaterState } from "@/lib/updater";
import { phonePairingSettingsAction } from "@/lib/phone-pairing";
import { activeLocale } from "@/lib/i18n";
import { AnnouncementCard, announcementPlaceAction } from "./AnnouncementCard";

import { engineReady } from "./EngineLibrary";

import { CLOUD_NOTICE_CARD, cloudNoticeStep, CloudNoticeCard } from "./CloudNotice";
import { useMoveQuiet } from "./CloudSendStrip";
import { CloudTrialNoticeCard, useCloudPlanSnapshot } from "./CloudTrialNotice";
import { GrokMovePopup, reportGrokMovePopup, type GrokMovePopupAction } from "./GrokMovePopup";
import { GrokMoveDialog } from "./lazy-screens";
import { useDesktopNotices, useOtherDialogOpen } from "./notice-dialogs";
import { localDesktopPage } from "./onboarding/WelcomeGate";
import { UpdatesConsentDialog, updatesConsentBridge, useUpdatesConsent } from "./UpdatesConsent";
import { useCryBotWelcomeDue } from "./CryBotWelcome";
import { NewLookNotice, reportNewLook } from "./NewLookNotice";
import { PhoneUpdateCard, phonesToTell, useRetiredLinkPhones } from "./PhoneUpdateNotice";
import { reportSimpleModePrompt, SimpleModePrompt } from "./SimpleModePrompt";
import { TwoPlacesCard } from "./TwoPlacesCard";

const trialKey = (trial: { state: string; endsAt: number }) => `${trial.state}:${trial.endsAt}`;
/** A first run lands in its Chief's chat, whose first messages arrive one at a time; the Grok Bot popup follows them. */
const FIRST_MESSAGES_MS = 6_000;

export function AppNotices({ quiet = false, viewer = null, now = Date.now }: { quiet?: boolean; viewer?: WelcomeViewer | null; now?: () => number }) {
  const { state, dispatch } = useStore();
  const remote = window.cry?.remoteClient?.active === true;
  const local = localDesktopPage();
  const bridge = !remote && local ? window.cry?.cloudAccount : undefined;
  const desktop = remote ? undefined : window.cry?.desktopNotices;
  const desktopState = useDesktopNotices(desktop);
  // Asked once main has restored the Cloud sign-in, which it waits for before answering desktopState.
  const planBridge = !remote && (bridge || (viewer?.cloudHome && (desktopState || !desktop))) ? window.cry?.cloudPlan : undefined;
  const [account, setAccount] = useState<CloudAccountState | null>(null);
  const plan = useCloudPlanSnapshot(planBridge);
  const [organization, setOrganization] = useState<boolean | null>(window.cry?.organization ? null : false);
  const [closed, setClosed] = useState(false);
  const [trialOpen, setTrialOpen] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [simpleShown, setSimpleShown] = useState(false);

  const [announcementShown, setAnnouncementShown] = useState<string | null>(null);
  const [grokShown, setGrokShown] = useState(false);
  const [grokOpen, setGrokOpen] = useState(false);
  const [grokLanded, setGrokLanded] = useState(false);
  const consentHere = (local || viewer?.cloudHome === true) && brandStatus().source !== "file";
  const consent = useUpdatesConsent(consentHere ? updatesConsentBridge() : undefined);
  const [consentDone, setConsentDone] = useState(false);
  const updater = useUpdaterState();
  const intent = useCloudIntent();
  const moving = useMoveQuiet(now);
  const botBot = useCryBotWelcomeDue(viewer);
  // Bots in two places: this computer's page only, where main knows what lives here.
  const two = useTwoPlaces();
  const twoFact = !local || two.suggest === null ? false : two.suggest === undefined ? null : true;
  // Phones whose older app lost its way in: this computer's own page only, never a Cloud, a server's page or client mode.
  const linkPhones = useRetiredLinkPhones(!remote && local);
  useEffect(() => {
    if (!bridge) return;
    let active = true, updated = false;
    const unsubscribe = bridge.onState(next => { updated = true; if (active) setAccount(next); });
    void bridge.state().then(next => { if (active && !updated) setAccount(next); }).catch(() => {});
    return () => { active = false; unsubscribe(); };
  }, [bridge]);
  useEffect(() => {
    const org = window.cry?.organization;
    if (!org) return;
    let active = true;
    const read = (next: { status: string; organization?: unknown }) => { if (active) setOrganization(next.status !== "signed-out" && Boolean(next.organization)); };
    const unsubscribe = org.onState(read);
    void org.state().then(read, () => { if (active) setOrganization(false); });
    return () => { active = false; unsubscribe(); };
  }, []);
  const view = bridge ? cloudPlanView(account) : null;
  const record = state.config?.onboarding;
  const trialDue = cloudTrialNotice(plan);
  const consentDue = consent.state?.available === true && consent.state.due && !consentDone;
  const consentBlocked = useOtherDialogOpen(consentDue) || Boolean(state.liveCall && state.liveCall.status !== "ended");
  const consentFact = !consentHere || consentDone ? false : consent.state === undefined ? null : consentDue ? (consentBlocked ? null : true) : false;
  // Every page with the app's chrome, desktop or Cloud, new install or not: once per browser, as the mode is. With Simple
  // the only mode, its place goes to the word about the new look, only where Advanced was on; a browser put back on
  // Advanced gets the word that it is back there instead.
  const promptSeen = useSimpleModePromptSeen(), newLookDue = useNewLookDue(), backDue = useAdvancedBackDue(), advanced = useAdvancedMode();
  const advancedBack = backDue && advanced;
  const simpleDue = SIMPLE_ONLY ? newLookDue : advancedBack || !promptSeen;
  const simpleBlocked = useOtherDialogOpen(simpleDue) || Boolean(state.liveCall && state.liveCall.status !== "ended");
  // A sponsor's card is for whoever chooses a team's providers: its Owner and Admins, never its members.
  const sponsorsHere = SPONSOR_CARDS_FOR_TEAM_MEMBERS || !state.config?.team || viewer?.canSave === true;

  const trial = plan?.trial;
  const key = trial ? trialKey(trial) : null;
  const setupRecord = record && (intent.pending || intent.sent) ? { ...record, hintsSeen: [...record.hintsSeen, CLOUD_INTENT_GIVEN] } : record;
  const setupHere = cloudSignInDue(viewer, state, engineReady)
    || ["waiting", "shown"].includes(cloudSetupStage({ viewer, connected: state.connected, enginesKnown: state.instances.length > 0,
      engineReady: state.instances.some(engineReady), onboarding: setupRecord, planned: Boolean(jobRoutine(state.routines, intent.sent)) }));
  const waits = cornerPopupWaits(state, updater, { quiet, idle: true, viewer, duringFirstChat: true }) || setupHere;
  const kind = view ? cloudNoticeKind(view, account) : null;
  const cards = Boolean(bridge || planBridge);
  // Promotions never land on a new install's first chat: they wait for its first reply, and the full-screen What's new popup
  // also for a launch after the one whose welcome just finished. Account and billing notices keep their own rules.
  // Unknown (null) until the bots have loaded, so nothing lower in the queue flashes up before them.
  const firstChat = firstReplyPending(state);
  // CryBot's first-launch card goes first: the popup and the question wait while it is due. The popup skips a launch the
  // card used; the question may follow the card once it closes, as it follows the popup.
  const afterWelcome = welcomeFinishedThisLaunch() || launchDialogShown() === "crybot" || firstChat;
  const consentWaits = welcomeFinishedThisLaunch() || firstChat;
  const botBotFirst = botBot.due;
  const consentNow = consentWaits === true || consentFact === false ? false : consentWaits === null || botBotFirst ? null : consentFact;
  // The Grok Bot popup: once for everyone who can add a bot, the one thing a first chat may be interrupted by. Nothing reads
  // this computer for it: GrokMoveDialog does that, once opened.
  const grokDue = !remote && viewer?.canSave !== false && !state.config?.team && brandStatus().source !== "file" && organization !== true && moving !== true
    && launchDialogShown() !== "crybot" && !noticeSeen(record, GROK_MOVE_NOTICE) && !desktopState?.seen.includes(GROK_MOVE_NOTICE);
  const grokBlocked = useOtherDialogOpen(grokDue) || Boolean(state.liveCall && state.liveCall.status !== "ended");
  const grokLanding = welcomeFinishedThisLaunch() && !grokLanded;
  useEffect(() => {
    if (!grokDue || !grokLanding || waits) return;
    const timer = setTimeout(() => setGrokLanded(true), FIRST_MESSAGES_MS);
    return () => clearTimeout(timer);
  }, [grokDue, grokLanding, waits]);
  const grokNow = !grokDue ? false
    : !viewer || (desktop && !desktopState) || organization === null || firstChat === null || botBotFirst || moving === null || grokLanding || grokBlocked ? null : true;
  // Everyone, whether or not a bot has answered yet (so not `afterWelcome`, which holds until one has), but never in the launch
  // the welcome or CryBot's card took, or during a live call.

  // A card from the project's announcements file: the built-in sponsor card's exclusions, and src/lib/announcements.ts's rules for
  // which card and for whom (once per person, one sponsor card a week, none on a branded build).
  const branded = brandStatus().source === "file", team = Boolean(state.config?.team);
  const remoteCards = useAnnouncementCards(!branded);
  const surface = announcementSurface(local, Boolean(state.config?.cloudHome || viewer?.cloudHome));
  const seenRecord: SeenRecord = { record, desktop: desktopState?.seen ?? [], team };
  const picked = remoteCards.length === 0 ? null : pickAnnouncement(remoteCards, {
    facts: { nowMs: now(), version: appVersion(), platform: announcementPlatform(globalThis.navigator?.userAgent), surface, plan: announcementPlan(surface, view, team),
      people: usedBefore(state.bots) ? "existing" : "new", locale: activeLocale(), conditions: announcementConditions(state) },
    seen: seenRecord, branded, admin: viewer?.canSave !== false,
    sponsors: !providersRestricted(state.config?.managedPolicy) && sponsorsHere,
  });
  const announcement = picked && picked !== "wait" ? picked : null;
  const announcementNow = !picked || moving || welcomeFinishedThisLaunch() || launchDialogShown() === "crybot" ? false
    : picked === "wait" || !viewer || organization === null || moving === null || firstChat === null || botBotFirst || (state.liveCall && state.liveCall.status !== "ended") || (desktop && !desktopState) ? null : true;
  const remembering = { desktop, liveIds: new Set(remoteCards.map(card => card.id)), save: (hintsSeen: string[]) => void api("/api/config", { method: "PUT", body: JSON.stringify({ onboarding: { hintsSeen } }) })
    .then(config => dispatch({ type: "configStatus", config })).catch(() => {}) };
  const retiredPhones = phonesToTell(linkPhones, record);
  const phoneNow = retiredPhones?.length === 0 ? false
    : retiredPhones === undefined || !viewer || botBotFirst || (state.liveCall && state.liveCall.status !== "ended") ? null : true;
  const launch = launchNotice();
  // After a closed popup only the product-updates question and ModelGo's card may follow in this launch (nextNotice's
  // FOLLOWERS); nothing else does.
  const notice = waits ? null
    : firstChatQuiet(state) ? (grokNow === true && (launch === null || launch === GROK_MOVE_NOTICE) ? GROK_MOVE_NOTICE : null)
    : cards || consentHere || simpleDue || announcementNow !== false || twoFact !== false || grokNow !== false || phoneNow !== false ? nextNotice({
    [GROK_MOVE_NOTICE]: grokNow,
    [PHONE_UPDATE_NOTICE]: phoneNow,
    // As the What's new popup: never in the launch whose welcome just finished, nor over CryBot's first-launch card.
    [SIMPLE_MODE_NOTICE]: !simpleDue || afterWelcome === true ? false : afterWelcome === null || botBotFirst || simpleBlocked ? null : true,
    [UPDATES_CONSENT_NOTICE]: consentNow,
    [TWO_PLACES_NOTICE]: twoFact,

    [CLOUD_TRIAL_NOTICE]: planBridge && plan === null ? null : Boolean(key && (trialDue || trialOpen === key)),
    [CLOUD_NOTICE]: !view ? false : view.kind === "unknown" ? null
      : Boolean(kind && !noticeSeen(record, CLOUD_NOTICE_CARD[kind].dismissed)),

    [ANNOUNCEMENT_NOTICE]: announcementNow,

  }, () => false, launch, closed) : null;

  const shownKey = notice === CLOUD_TRIAL_NOTICE ? key : notice === ANNOUNCEMENT_NOTICE ? `${notice}:${announcement?.id}` : notice;
  useEffect(() => {
    if (!shownKey || !notice) return;
    markLaunchNotice(notice);
    // The popups and the question own this launch: CryBot's first-launch card waits for a later one.
    if (shownKey === GROK_MOVE_NOTICE || shownKey === SIMPLE_MODE_NOTICE || shownKey === UPDATES_CONSENT_NOTICE) markLaunchDialog("notices");
    if (notice === CLOUD_TRIAL_NOTICE && trialOpen !== shownKey) {
      setTrialOpen(shownKey);
      void planBridge?.noticeSeen?.().catch(() => {});
    } else if (shownKey === SIMPLE_MODE_NOTICE && !simpleShown) {
      setSimpleShown(true);
      if (SIMPLE_ONLY || advancedBack) reportNewLook("shown", advancedBack);
      else reportSimpleModePrompt("shown");
    } else if (notice === ANNOUNCEMENT_NOTICE && announcement && announcementShown !== announcement.id) {
      setAnnouncementShown(announcement.id);
      markLaunchAnnouncement(announcement.id);
      reportAnnouncement(announcement, "shown");
      if (announcement.kind === "sponsor") rememberSponsorDay(seenRecord, now(), remembering);
    } else if (shownKey === GROK_MOVE_NOTICE && !grokShown) {
      setGrokShown(true);
      reportGrokMovePopup("shown");
    }
  }, [shownKey]);

  const save = (id: string) => {
    const patch = dismissNotice(record, id);
    if (patch) void api("/api/config", { method: "PUT", body: JSON.stringify(patch) })
      .then(config => dispatch({ type: "configStatus", config })).catch(() => {});
  };
  const close = () => { setClosed(true); setTrialOpen(null); setFailed(false); };
  if (grokOpen) return <GrokMoveDialog onClose={() => setGrokOpen(false)} />;
  if (!notice) return null;

  if (notice === GROK_MOVE_NOTICE) {
    const done = (action: GrokMovePopupAction) => {
      reportGrokMovePopup(action); close(); save(GROK_MOVE_NOTICE);
      void desktop?.seen(GROK_MOVE_NOTICE).catch(() => {});
      if (action === "start") setGrokOpen(true);
    };
    return <GrokMovePopup onDone={done} />;
  }

  if (notice === PHONE_UPDATE_NOTICE && retiredPhones?.length) {
    const done = () => { close(); const patch = dismissNotices(record, retiredPhones.map(phone => phoneUpdateHint(phone.id)));
      if (patch) void api("/api/config", { method: "PUT", body: JSON.stringify(patch) }).then(config => dispatch({ type: "configStatus", config })).catch(() => {}); };
    return <PhoneUpdateCard phones={retiredPhones} onOpen={() => { done(); dispatch(phonePairingSettingsAction()); }} onDismiss={done} />;
  }

  if (notice === SIMPLE_MODE_NOTICE) {
    return SIMPLE_ONLY || advancedBack ? <NewLookNotice onClose={close} back={advancedBack} /> : <SimpleModePrompt onClose={close} />;
  }

  if (notice === UPDATES_CONSENT_NOTICE && consent.state) {
    const done = () => { setConsentDone(true); close(); };
    return <UpdatesConsentDialog signedIn={consent.state.signedIn}
      onYes={async email => { await consent.choose("opted_in", email); done(); }}
      onNo={() => { done(); void consent.choose("declined").catch(() => {}); }} />;
  }
  if (notice === CLOUD_TRIAL_NOTICE && trial) {
    const shown = cloudTrialView(trial, plan?.credit);
    const act = () => { setFailed(false); void planBridge?.manage().then(close, () => setFailed(true)); };
    return <CloudTrialNoticeCard view={shown} failed={failed} onAction={act} onClose={close} />;
  }
  if (notice === CLOUD_NOTICE && kind && bridge) {
    const act = () => {
      if (busy) return;
      setFailed(false); setBusy(true);
      void cloudNoticeStep(kind, bridge).then(next => setAccount(next), () => setFailed(true)).finally(() => setBusy(false));
    };
    return <CloudNoticeCard kind={kind} busy={busy} failed={failed} onAction={act} onNotNow={() => { close(); save(CLOUD_NOTICE_CARD[kind].dismissed); }} />;
  }
  if (notice === TWO_PLACES_NOTICE && two.suggest) {
    const { key } = two.suggest;
    return <TwoPlacesCard key={key} suggest={two.suggest}
      onBring={() => {  return two.accept(key).then(close); }}
      onDismiss={() => {  two.dismiss(key); close(); }} />;
  }
  if (notice === ANNOUNCEMENT_NOTICE && announcement) {
    const done = (action: "primary" | "secondary" | "close") => {
      reportAnnouncement(announcement, action); close(); rememberCardSeen(seenRecord, announcement.id, remembering);
    };
    return <AnnouncementCard key={announcement.id} card={announcement} onDone={done} open={place => dispatch(announcementPlaceAction(place))} />;
  }
  return null;
}
