import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { MAX_LOCAL_VM_IDLE_TIMEOUT_MINUTES, MIN_LOCAL_VM_IDLE_TIMEOUT_MINUTES, parseLocalVmIdleTimeoutMinutes } from "@/lib/local-vm-idle-timeout";
import { SETTINGS_INLINE_INPUT } from "./SettingsPrimitives";

export function LocalVmIdleTimeoutSetting({
  minutes,
  disabled,
  onSave,
}: {
  minutes: number;
  disabled: boolean;
  onSave: (minutes: number) => Promise<void>;
}) {
  const [value, setValue] = useState(String(minutes));
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dirty) setValue(String(minutes));
  }, [minutes, dirty]);

  const save = async () => {
    if (!dirty || saving) return;
    const parsed = parseLocalVmIdleTimeoutMinutes(value);
    if (parsed === null) {
      setError(t("vm.idle.range"));
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed);
      setValue(String(parsed));
      setDirty(false);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("vm.idle.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <label htmlFor="local-vm-idle-timeout" className="text-[14px] leading-5 text-ink">{t("vm.idle.label")}</label>
          <div id="local-vm-idle-timeout-help" className="text-[13px] leading-[18px] text-ink-secondary">{t("vm.idle.detail")}</div>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <input
            id="local-vm-idle-timeout"
            type="number"
            min={MIN_LOCAL_VM_IDLE_TIMEOUT_MINUTES}
            max={MAX_LOCAL_VM_IDLE_TIMEOUT_MINUTES}
            step={1}
            inputMode="numeric"
            value={value}
            disabled={disabled || saving}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "local-vm-idle-timeout-error local-vm-idle-timeout-help" : "local-vm-idle-timeout-help"}
            onChange={(event) => {
              setValue(event.target.value);
              setDirty(true);
              setError("");
            }}
            onBlur={() => void save()}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className={cn(SETTINGS_INLINE_INPUT, "w-16 bg-transparent", error && "border-danger/60")}
          />
          <span className="text-[13px] leading-5 text-ink-secondary">{t("vm.idle.minutes")}</span>
        </span>
      </div>
      {error ? (
        <p id="local-vm-idle-timeout-error" role="alert" className="text-[12px] leading-4 text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
