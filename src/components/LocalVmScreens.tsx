import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Hand, Loader2, Monitor } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import type { LocaleKey } from "@/locales";
import { api } from "@/state/store";
import { localVmScreenshotSource } from "@/lib/remote-desktop";
import { computerControlSnapshotSchema } from "@/lib/computer-control";
import { panelErrorText } from "@/lib/computer-messages";
import { Card, StatusDot } from "./SettingsPrimitives";
import { Select } from "./Select";
import { useComputerTakeover } from "./computer-takeover";

const LiveDesktop = lazy(() => import("./LiveDesktop").then((module) => ({ default: module.LiveDesktop })));

export interface ScreenListPayload {
  layout: "single" | "multi";
  screens: number;
  slots: Array<{
    screen: number;
    state: "off" | "starting" | "ready" | "stopping" | "failed";
    bot: { id: string; name: string } | null;
    viewerTarget: string;
    controlledByPerson: boolean;
    idleSeconds: number | null;
  }>;
  queue: Array<{ bot: { id: string; name: string }; position: number; waitingSeconds: number }>;
}

type ScreenSlot = ScreenListPayload["slots"][number];
const stateLabels: Record<ScreenSlot["state"], LocaleKey> = {
  off: "vm.state.stopped",
  starting: "vm.state.starting",
  ready: "vm.state.running",
  stopping: "vm.state.goingToSleep",
  failed: "vm.state.attention",
};

export function LocalVmScreenSetting({ screens, disabled, onChange }: { screens: number; disabled: boolean; onChange: (screens: number) => void }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <div><div className="text-[13px] text-ink">{t("vm.screens.count")}</div><div className="text-[12px] text-ink-secondary">{t("vm.screens.resources")}</div></div>
      <Select size="sm" aria-label={t("vm.screens.count")} value={screens} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))}>
        {[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}
      </Select>
    </div>
  );
}

export async function saveScreens(screens: number): Promise<void> {
  const response = await fetch("/api/config", {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ localVm: { screens } }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? t("vm.policyError"));
}

const durationText = (seconds: number, secondKey: LocaleKey, minuteKey: LocaleKey) => {
  const value = Math.max(0, Math.floor(seconds));
  return t(value >= 60 ? minuteKey : secondKey, { [value >= 60 ? "minutes" : "seconds"]: value >= 60 ? Math.floor(value / 60) : value });
};

export function LocalVmScreens({ payload }: { payload: ScreenListPayload }) {
  return payload.layout === "multi" ? <ScreenList payload={payload} /> : null;
}

function ScreenList({ payload }: { payload: ScreenListPayload }) {
  const [selected, setSelected] = useState<number | null>(null);
  const slot = payload.slots.find((candidate) => candidate.screen === selected)
    ?? payload.slots.find((candidate) => candidate.state === "ready") ?? payload.slots[0];
  return (
    <Card title={t("vm.screens.title")} subtitle={t("vm.screens.detail")}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label={t("vm.screens.title")}>
        {payload.slots.map((screen) => (
          <button key={screen.screen} type="button" aria-pressed={slot?.screen === screen.screen}
            aria-label={t("vm.screens.watch", { screen: screen.screen })}
            onClick={() => setSelected(screen.screen)}
            className={cn("min-w-0 rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-focus",
              slot?.screen === screen.screen ? "border-accent bg-accent/5" : "border-hairline bg-panel hover:bg-raised-hover")}>
            <span className="flex items-center gap-2 text-[14px] font-medium text-ink">
              <Monitor size={16} aria-hidden="true" />{t("vm.screens.number", { screen: screen.screen })}
              <span className="ml-auto flex items-center text-[12px] font-normal text-ink-secondary">
                <StatusDot tone={screen.state === "ready" ? "success" : screen.state === "failed" ? "warning" : null} />
                {t(stateLabels[screen.state])}
              </span>
            </span>
            <span className="mt-2 block truncate text-[13px] text-ink">{screen.bot?.name ?? t("vm.screens.available")}</span>
            <span className="mt-1 block text-[12px] text-ink-secondary">
              {screen.controlledByPerson ? t("vm.screens.controlled")
                : screen.idleSeconds !== null ? durationText(screen.idleSeconds, "vm.screens.idle", "vm.screens.idleMinutes")
                  : t("vm.screens.noActivity")}
            </span>
          </button>
        ))}
      </div>
      {slot && <ScreenViewer key={`${slot.viewerTarget}:${slot.bot?.id ?? ""}:${slot.state}`} slot={slot} />}
      {payload.queue.length > 0 && (
        <section className="mt-4 border-t border-hairline pt-3" aria-label={t("vm.screens.queue")}>
          <h3 className="text-[13px] font-medium text-ink">{t("vm.screens.queue")}</h3>
          <p className="mt-1 text-[12px] text-ink-secondary">{t("vm.screens.queueDetail")}</p>
          <ol className="mt-2 space-y-2">
            {payload.queue.map((entry) => (
              <li key={entry.bot.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                <span className="font-medium text-ink">{entry.bot.name}</span>
                <span className="text-ink-secondary">{t("vm.screens.queued", { position: entry.position })}</span>
                <span className="text-ink-secondary">{durationText(entry.waitingSeconds, "vm.screens.waited", "vm.screens.waitedMinutes")}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </Card>
  );
}

function ScreenViewer({ slot }: { slot: ScreenSlot }) {
  const [frame, setFrame] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [held, setHeld] = useState(slot.controlledByPerson);
  const label = t("vm.screens.number", { screen: slot.screen });
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => setHeld(slot.controlledByPerson), [slot.controlledByPerson]);
  const request = useCallback(async (action: "take" | "release", controlLeaseId?: string) => {
    const snap = computerControlSnapshotSchema.parse(await api(`/api/bots/${slot.bot!.id}/computer/control`, {
      method: "POST", body: JSON.stringify({ action, target: slot.viewerTarget, ...(controlLeaseId ? { controlLeaseId } : {}) }),
    }));
    if (!active.current && action === "take") {
      if (snap.owned) await api(`/api/bots/${slot.bot!.id}/computer/control`, {
        method: "POST", body: JSON.stringify({ action: "release", target: slot.viewerTarget, controlLeaseId }),
      });
      throw new DOMException("Screen view closed", "AbortError");
    }
    setHeld(snap.held);
    return snap;
  }, [slot.bot, slot.viewerTarget]);
  const takeover = useComputerTakeover({
    botId: slot.bot?.id ?? "", session: slot.viewerTarget, held, request, viewerClose: null,
  });
  useEffect(() => {
    if (slot.state !== "ready" || takeover.here) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const shoot = async () => {
      try {
        const result = await api(`/api/local-computer/screens/${slot.screen}/screenshot`, { method: "POST", body: "{}", signal: controller.signal });
        if (!controller.signal.aborted) {
          setFrame(localVmScreenshotSource(result));
          setError(null);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(panelErrorText(cause instanceof Error ? cause : String(cause)));
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(() => void shoot(), 5_000);
      }
    };
    void shoot();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [slot.screen, slot.state, takeover.here]);
  const control = async () => {
    setPending(true);
    setError(null);
    try {
      if (takeover.here) await takeover.handBack();
      else await takeover.take();
    } catch (cause) {
      setError(panelErrorText(cause instanceof Error ? cause : String(cause)));
    } finally { setPending(false); }
  };
  return (
    <section className="mt-4" aria-label={label}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <button type="button" className="settings-quiet inline-flex min-h-11 items-center gap-1.5 disabled:opacity-40"
          disabled={pending || slot.state !== "ready" || !slot.bot} onClick={() => void control()}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Hand size={14} aria-hidden="true" />}
          {t(takeover.here ? "computer.handBack" : "vm.screens.take")}
        </button>
      </div>
      <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl bg-inset">
        {takeover.here ? (
          <Suspense fallback={<Loader2 size={18} className="animate-spin text-ink-secondary" />}>
            <LiveDesktop target={slot.viewerTarget} threadId="" name={label} poster={frame}
              expanded={takeover.expanded} onExpandedChange={takeover.setExpanded}
              onHandBack={() => void control()} handingBack={pending}
              onUnreachable={() => { takeover.leave(); setError(t("computer.err.openDesktop")); }} />
          </Suspense>
        ) : frame ? <img src={frame} alt={label} className="h-full w-full object-contain" />
          : <span role="status" className="text-[13px] text-ink-secondary">{t(slot.state === "ready" ? "computer.waitingFrame" : stateLabels[slot.state])}</span>}
      </div>
      {error && <p role="alert" className="mt-2 text-[12px] text-danger">{error}</p>}
    </section>
  );
}
