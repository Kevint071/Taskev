import { type KeyboardEvent, useRef } from "react";
import { SettingsIconTile } from "@/components/settings-icons";
import { SETTINGS_TABS, type SettingsTab } from "@/lib/settings-tabs";

/** Desktop tab strip with arrow-key navigation between sections. */
export function SettingsTabBar({
  active,
  onSelect,
}: {
  active: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
}) {
  const tabRefs = useRef(new Map<SettingsTab, HTMLButtonElement>());

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const index = SETTINGS_TABS.findIndex((tab) => tab.value === active);
    const next =
      SETTINGS_TABS[
        (index + step + SETTINGS_TABS.length) % SETTINGS_TABS.length
      ].value;
    onSelect(next);
    tabRefs.current.get(next)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Secciones de ajustes"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      // The bar's rule is an inset shadow, not a border: a border would need
      // the tabs to overlap it (-mb-px), which makes them overflow the box
      // and turns overflow-x-auto into a 1px vertical scroll.
      className="hidden gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-line)] md:flex"
    >
      {SETTINGS_TABS.map((tab) => {
        const selected = tab.value === active;
        return (
          <button
            key={tab.value}
            ref={(node) => {
              if (node) tabRefs.current.set(tab.value, node);
              else tabRefs.current.delete(tab.value);
            }}
            type="button"
            role="tab"
            id={`settings-tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`settings-panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(tab.value)}
            // The active underline paints over the bar's inset rule.
            className={`flex h-12 shrink-0 items-center gap-2.5 whitespace-nowrap border-b-2 px-3 font-medium transition-colors ${
              selected
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            <SettingsIconTile tab={tab.value} className="size-7 rounded-lg" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
