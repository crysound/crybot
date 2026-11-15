import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "@/state/api";
import { t } from "@/lib/i18n";
import { ConfirmDialog } from "./ConfirmDialog";

interface Snapshot { id: string; name: string; state: string }
type Action = { kind: "restore" | "delete"; snapshot: Snapshot };
const button = "rounded-lg bg-control px-3 py-2 text-[12px] text-ink hover:bg-raised-hover disabled:opacity-50";

function snapshotError(error: unknown): string {
  const code = error instanceof ApiError ? error.body?.code : undefined;
  if (code === "instabox_key_missing") return t("computer.instabox.keyMissing");
  if (code === "instabox_snapshot_machine_missing") return t("computer.instabox.snapshots.machineMissing");
  if (code === "instabox_snapshot_busy") return t("computer.instabox.snapshots.busy");
  return t("computer.instabox.snapshots.error");
}

export function InstaboxSnapshots({ botId }: { botId: string }) {
  return <SnapshotPanel key={botId} botId={botId} />;
}

function SnapshotPanel({ botId }: { botId: string }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const base = `/api/bots/${encodeURIComponent(botId)}/instabox/snapshots`;

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void api<{ snapshots: Snapshot[] }>(base, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setSnapshots(data.snapshots);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(snapshotError(cause));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { mounted.current = false; controller.abort(); };
  }, [base]);

  const run = async (chosen?: Action) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const path = chosen ? `${base}/${encodeURIComponent(chosen.snapshot.id)}${chosen.kind === "restore" ? "/restore" : ""}` : base;
      await api(path, { timeoutMs: 720_000, method: chosen?.kind === "delete" ? "DELETE" : "POST", ...(!chosen ? { body: "{}" } : {}) });
      const data = await api<{ snapshots: Snapshot[] }>(base);
      if (mounted.current) { setSnapshots(data.snapshots); setAction(null); }
    } catch (cause) {
      if (mounted.current) { setError(snapshotError(cause)); setAction(null); }
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };

  return (
    <section className="mt-3 min-w-0 rounded-xl bg-card p-4" aria-label={t("computer.instabox.snapshots.title")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[14px] font-medium text-ink">{t("computer.instabox.snapshots.title")}</h3>
        <button type="button" className={button} disabled={loading || pending} onClick={() => void run()}>{t("computer.instabox.snapshots.save")}</button>
      </div>
      <p className="mt-2 text-[12px] leading-5 text-ink-secondary">{t("computer.instabox.snapshots.hint")}</p>
      {(loading || pending) && <p role="status" className="mt-2 flex items-center gap-2 text-[12px] text-ink-secondary"><Loader2 size={14} className="animate-spin" />{t("computer.instabox.snapshots.busy")}</p>}
      {error && <p role="alert" className="mt-2 text-[12px] text-danger">{error}</p>}
      {!loading && !error && snapshots.length === 0 && <p className="mt-3 text-[12px] text-ink-secondary">{t("computer.instabox.snapshots.empty")}</p>}
      <ul className="mt-2 min-w-0 divide-y divide-hairline/40">
        {snapshots.map((snapshot) => (
          <li key={snapshot.id} className="flex min-w-0 flex-wrap items-center gap-2 py-2">
            <span className="min-w-0 flex-[1_1_12rem] break-all text-[12px] text-ink">{snapshot.name}</span>
            <span className="flex shrink-0 gap-2">
              <button type="button" className={button} disabled={pending || snapshot.state !== "ready"} onClick={() => setAction({ kind: "restore", snapshot })}>{t("computer.instabox.snapshots.restore")}</button>
              <button type="button" className={`${button} text-danger`} disabled={pending} onClick={() => setAction({ kind: "delete", snapshot })}>{t("common.delete")}</button>
            </span>
          </li>
        ))}
      </ul>
      <ConfirmDialog open={action !== null}
        title={t(action?.kind === "restore" ? "computer.instabox.snapshots.restore" : "computer.instabox.snapshots.deleteTitle")}
        body={<><span className="block break-all">{action?.snapshot.name}</span><span className="mt-2 block">{t(action?.kind === "restore" ? "computer.instabox.snapshots.restoreConfirm" : "computer.instabox.snapshots.deleteConfirm")}</span></>}
        confirmLabel={t(action?.kind === "restore" ? "computer.instabox.snapshots.restore" : "common.delete")}
        pending={pending} onCancel={() => { if (!busy.current) setAction(null); }} onConfirm={() => { if (action) void run(action); }} />
    </section>
  );
}
