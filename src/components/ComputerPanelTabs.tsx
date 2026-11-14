import { cn } from "@/lib/cn";
import type { ComputerPanelView } from "@/lib/computer-panel-view";
import { t } from "@/lib/i18n";
import { isComputerPlace, type EffectivePlace } from "@/lib/place";
import { moveBetweenTabs, PANEL_TABS, panelTabProps, scrollTabsWithWheel } from "./computer-panel-tabs";

export function ComputerPanelTabs({
  tabs,
  selected,
  livePlace,
  busy,
  onSelect,
}: {
  tabs: readonly ComputerPanelView[];
  selected: ComputerPanelView;
  livePlace: EffectivePlace;
  busy: boolean;
  onSelect: (view: ComputerPanelView) => void;
}) {
  return (
    <div
      className="mx-9 flex min-w-0 touch-pan-x gap-0.5 overflow-x-auto whitespace-nowrap rounded-full bg-inset p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-tour="computer-tabs"
      data-testid="computer-tabs"
      role="tablist"
      aria-label={t("computer.tabsAria")}
      onWheel={scrollTabsWithWheel}
      onKeyDown={(event) => moveBetweenTabs(event, tabs, onSelect)}
    >
      {tabs.map((view) => {
        const { Icon, label, tour } = PANEL_TABS[view];
        const live = !busy ? undefined
          : view === "computer" && isComputerPlace(livePlace) ? "computer-tab-live"
          : view === "browser" && livePlace === "browser" ? "browser-tab-live" : undefined;
        return (
          <button
            key={view}
            type="button"
            data-tour={tour}
            {...panelTabProps(view, view === selected)}
            title={t(label)}
            onClick={() => onSelect(view)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] transition-colors @max-[28rem]/paneltabs:[&>svg]:hidden @max-[22rem]/paneltabs:px-2",
              view === selected ? "bg-raised text-ink shadow-sm" : "text-ink-secondary hover:text-ink",
            )}
          >
            <Icon size={13} /> {t(label)}
            {live && (
              <span
                className="size-1.5 animate-pulse rounded-full bg-success"
                role="img"
                aria-label={t("place.live")}
                data-testid={live}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
