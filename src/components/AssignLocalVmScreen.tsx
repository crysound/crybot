import { useEffect, useRef, useState } from "react";
import { api } from "@/state/store";
import { t } from "@/lib/i18n";
import { panelErrorText } from "@/lib/computer-messages";
import type { LocalVmStatus } from "@/lib/local-vm-screen-state";

export function AssignLocalVmScreen({ path, position, visible = true, onAssigned }: {
  path: string;
  position?: number;
  visible?: boolean;
  onAssigned(): Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [queuePosition, setQueuePosition] = useState(position);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const assigned = useRef(onAssigned);
  assigned.current = onAssigned;
  useEffect(() => { if (!request.current) setQueuePosition(position); }, [position]);
  useEffect(() => () => { request.current?.abort(); clearTimeout(timer.current); request.current = null; }, [path]);
  const assign = async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(null);
    const poll = async (first: boolean): Promise<void> => {
      try {
        const url = new URL(path, window.location.origin);
        if (first) url.pathname += "/assign-screen";
        const status: LocalVmStatus = await api(url.pathname + url.search, {
          ...(first ? { method: "POST", body: "{}" } : { background: true }), signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setQueuePosition(status.queue_position);
        if (status.ready && status.screen !== null) {
          await assigned.current();
          if (controller.signal.aborted) return;
          request.current = null;
          setPending(false);
        } else {
          timer.current = setTimeout(() => void poll(false), 2000);
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        request.current = null;
        setPending(false);
        setError(panelErrorText(cause instanceof Error ? cause : String(cause)));
      }
    };
    await poll(true);
  };
  if (!visible && !pending && !error) return null;
  return <div className="mb-3">
    <p role="status" className="mb-3 rounded-lg bg-card p-3 text-[13px] text-ink-secondary">
      {queuePosition ? t("vm.screens.queued", { position: queuePosition }) : t(pending ? "settings.updates.opening" : "vm.screens.unassignedBot")}
      {queuePosition ? ` ${t("vm.screens.queueDetail")}` : null}
    </p>
    {(!queuePosition || error) && <button type="button" disabled={pending} onClick={() => void assign()}
      className="rounded-lg bg-accent px-4 py-2 text-[13px] text-white disabled:opacity-50">
      {t(pending ? "settings.updates.opening" : error ? "chat.retry" : "vm.screens.assignNow")}
    </button>}
    {error && <p role="alert" className="mt-2 text-[12px] text-danger">{error}</p>}
  </div>;
}
