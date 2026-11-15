import { useEffect, useRef, useState } from "react";
import { t } from "../lib/i18n";
import type { IslandSettings as Settings } from "../../shared/island";
import { useDesktopCapabilities } from "./DesktopCapabilities";
import { SettingRow, Switch } from "./SettingsPrimitives";

export function IslandSettings() {
  const { capabilities } = useDesktopCapabilities();
  const bridge = typeof window === "undefined" ? undefined : window.cry?.islandSettings;
  const [settings, setSettings] = useState<Settings | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const widthDirty = useRef(false);
  useEffect(() => { let alive = true; void bridge?.state().then(value => { if (alive) setSettings(value); }).catch(() => {}); return () => { alive = false; }; }, [bridge]);
  if (!bridge || !settings || capabilities.host?.platform !== "darwin") return null;
  const save = (change: Partial<Settings>) => void bridge.set(change).then(setSettings).catch(() => {});
  const commitWidth = () => {
    if (!widthDirty.current || width === null) return;
    widthDirty.current = false;
    save({ width });
  };
  return <>
    <SettingRow title={t("settings.island.enabled")}><Switch checked={settings.enabled} aria-label={t("settings.island.enabled")} onClick={() => save({ enabled: !settings.enabled })} /></SettingRow>
    <SettingRow title={t("settings.island.fullscreen")}><Switch checked={settings.fullscreen} aria-label={t("settings.island.fullscreen")} onClick={() => save({ fullscreen: !settings.fullscreen })} /></SettingRow>
    <SettingRow title={t("settings.island.width")} subtitle={t("settings.island.widthHint")}><input type="range" min={120} max={320} value={width ?? settings.width} aria-label={t("settings.island.width")} onChange={event => { widthDirty.current = true; setWidth(Number(event.target.value)); }}
      onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)} onPointerUp={commitWidth} onPointerCancel={commitWidth} onKeyUp={commitWidth} onBlur={commitWidth} /><output>{width ?? settings.width}px</output></SettingRow>
  </>;
}
