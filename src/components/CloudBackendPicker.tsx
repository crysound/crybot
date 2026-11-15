import { instaboxKeyStatus } from "./keys/key-catalog";
import type { CloudBackend } from "../../shared/wire";
import { cn } from "@/lib/cn";
import { useStore } from "@/state/store";
import { t } from "@/lib/i18n";

export function CloudBackendPicker({
  value,
  compact = false,
  onChange,
}: {
  value?: CloudBackend;
  compact?: boolean;
  onChange: (backend: CloudBackend) => void;
}) {
  const { state } = useStore();
  if (value !== "box" && state.config?.cloudHome) return null;
  const selected = value ?? "instabox";
  return (
    <div className="mt-3 rounded-lg bg-inset p-3">
      <div className="text-[12px] font-medium text-ink">{compact ? t("botAccess.cloud.provider") : t("botAccess.cloud.backend")}</div>
      <div className="mt-0.5 text-[12px] text-ink-secondary">
        {value === "box" ? t("botAccess.cloud.retired") : selected === "instabox" ? t("botAccess.cloud.instaboxDescription")
          : t(compact ? "botAccess.cloud.vpsDescription" : "botAccess.cloud.vpsAutoDescription")}
      </div>
      <div className="mt-2 flex overflow-hidden rounded-lg border border-hairline/40">
        {(["vps", "instabox"] as const).map((backend, i) => (
          <button
            key={backend}
            type="button"
            disabled={backend === "instabox" && !instaboxKeyStatus(state.config).configured}
            title={backend === "instabox" && !instaboxKeyStatus(state.config).configured ? t("botAccess.cloud.instaboxKeyHint") : undefined}
            aria-pressed={selected === backend}
            onClick={() => onChange(backend)}
            className={cn(
              "flex-1 py-1.5 text-[12px] disabled:opacity-50 disabled:cursor-not-allowed",
              i > 0 && "border-l border-hairline/40",
              selected === backend ? "bg-raised text-ink" : "text-ink-secondary hover:bg-raised/60 hover:text-ink",
            )}
          >
            {backend === "instabox" ? value === "box" ? t("botAccess.cloud.switchInstabox") : "InstaBox" : t("botAccess.cloud.selfHostedVps")}
          </button>
        ))}
      </div>
      {!instaboxKeyStatus(state.config).configured && <p className="mt-2 text-[12px] text-ink-secondary">{t("botAccess.cloud.instaboxKeyHint")}</p>}
    </div>
  );
}
