import { Globe } from "lucide-react";
import { t } from "@/lib/i18n";
import { Switch } from "./SettingsPrimitives";

export function ComputerBrowserSwitch({
  name,
  enabled,
  canTurnOn,
  turningOn,
  unavailable,
  onToggle,
}: {
  name: string;
  enabled: boolean;
  canTurnOn: boolean;
  turningOn: boolean;
  unavailable: string | null;
  onToggle: () => void;
}) {
  return (
    <div data-testid="browser-switch-row" className="mb-3 flex items-center gap-3 rounded-xl bg-card px-3 py-2.5">
      <Globe size={15} className="shrink-0 text-ink-secondary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-ink">{t("computer.browserSwitch.title", { name })}</div>
        {!canTurnOn && unavailable && <div className="text-[12px] text-ink-secondary">{unavailable}</div>}
      </div>
      <Switch checked={enabled} disabled={turningOn || (!enabled && !canTurnOn)} aria-label={t("computer.browserSwitch.title", { name })} onClick={onToggle} />
    </div>
  );
}
