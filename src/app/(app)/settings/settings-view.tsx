"use client";

import { useSearchParams } from "next/navigation";
import { type KeyboardEvent, type ReactNode, useEffect, useRef } from "react";
import {
  parseSettingsTab,
  SETTINGS_TAB_PARAM,
  SETTINGS_TABS,
  type SettingsTab,
  settingsHref,
} from "@/lib/settings-tabs";
import {
  AppearanceSection,
  DeleteAccountSection,
  PasswordSection,
  ProfileSection,
} from "./sections";

const iconProps = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "size-[18px] shrink-0",
  "aria-hidden": "true" as const,
};

const TAB_ICONS: Record<SettingsTab, ReactNode> = {
  perfil: (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="10" cy="7" r="3" />
      <path d="M4 16.5c.8-2.6 3.2-4.2 6-4.2s5.2 1.6 6 4.2" />
    </svg>
  ),
  apariencia: (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 3.5v13a6.5 6.5 0 0 0 0-13Z" fill="currentColor" />
    </svg>
  ),
  seguridad: (
    <svg {...iconProps} aria-hidden="true">
      <rect x="4.5" y="8.5" width="11" height="8" rx="1.6" />
      <path d="M7 8.5V6.5a3 3 0 0 1 6 0v2" />
    </svg>
  ),
  cuenta: (
    <svg {...iconProps} aria-hidden="true">
      <path d="M4 6h12M8.5 6V4.5h3V6M5.5 6l.7 9.6c.1.8.7 1.4 1.5 1.4h4.6c.8 0 1.4-.6 1.5-1.4L14.5 6" />
    </svg>
  ),
};

export function SettingsView({
  email,
  name,
}: {
  email: string;
  name: string | null;
}) {
  // The URL is the source of truth, so the avatar menu can deep-link into a
  // tab and a reload keeps the current one.
  const searchParams = useSearchParams();
  const active = parseSettingsTab(searchParams.get(SETTINGS_TAB_PARAM));
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<SettingsTab, HTMLButtonElement>());

  // On phones the pills overflow sideways; keep the active one in view,
  // scrolling only the strip so the page itself never jumps.
  useEffect(() => {
    const list = listRef.current;
    const tab = tabRefs.current.get(active);
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return;
    const offset =
      tab.getBoundingClientRect().left - list.getBoundingClientRect().left;
    list.scrollTo({
      left: list.scrollLeft + offset - (list.clientWidth - tab.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [active]);

  function select(tab: SettingsTab) {
    // Replace rather than push: switching tabs shouldn't fill the back stack.
    window.history.replaceState(null, "", settingsHref(tab));
  }

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
    select(next);
    tabRefs.current.get(next)?.focus();
  }

  const panels: Record<SettingsTab, ReactNode> = {
    perfil: <ProfileSection email={email} name={name} />,
    apariencia: <AppearanceSection />,
    seguridad: <PasswordSection />,
    cuenta: <DeleteAccountSection email={email} />,
  };

  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr] md:gap-10">
      {/* Horizontal pills on phones, a vertical list beside the panel on desktop. */}
      <div
        ref={listRef}
        role="tablist"
        aria-label="Secciones de ajustes"
        onKeyDown={handleKeyDown}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:sticky md:top-24 md:mx-0 md:flex-col md:gap-0.5 md:self-start md:overflow-visible md:px-0"
      >
        {SETTINGS_TABS.map((tab) => {
          const selected = tab.value === active;
          const danger = tab.value === "cuenta";
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
              onClick={() => select(tab.value)}
              className={`flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 font-medium transition-colors md:gap-2.5 md:rounded-control md:border-0 md:px-2 ${
                selected
                  ? danger
                    ? "border-transparent bg-danger/10 text-danger"
                    : "border-transparent bg-accent-soft text-accent"
                  : "border-line text-muted hover:bg-sunken hover:text-ink"
              }`}
            >
              {TAB_ICONS[tab.value]}
              {tab.label}
            </button>
          );
        })}
      </div>

      {SETTINGS_TABS.map((tab) => (
        // Inactive panels stay mounted but hidden so half-typed forms survive
        // a tab switch; unhiding also replays the reveal animation.
        <div
          key={tab.value}
          role="tabpanel"
          id={`settings-panel-${tab.value}`}
          aria-labelledby={`settings-tab-${tab.value}`}
          hidden={tab.value !== active}
          className="animate-reveal min-w-0 md:col-start-2 md:row-start-1"
        >
          {panels[tab.value]}
        </div>
      ))}
    </div>
  );
}
