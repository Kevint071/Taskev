"use client";

import { useSearchParams } from "next/navigation";
import { type KeyboardEvent, type ReactNode, useRef } from "react";
import { SettingsIconTile } from "@/components/settings-icons";
import { useTheme } from "@/components/theme-provider";
import { Avatar } from "@/components/ui/avatar";
import { BackIcon, ChevronRightIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/panel";
import type { Provider } from "@/lib/ai/provider";
import {
  DEFAULT_SETTINGS_TAB,
  parseSettingsSection,
  SETTINGS_PATH,
  SETTINGS_TAB_PARAM,
  SETTINGS_TABS,
  type SettingsTab,
  settingsHref,
} from "@/lib/settings-tabs";
import { THEME_OPTIONS } from "@/lib/theme";
import {
  AccountSection,
  AppearanceSection,
  AssistantSection,
  type KeyStatus,
  PasswordSection,
  ProfileSection,
} from "./sections";

/**
 * Phones drill down: a section index, then one section per screen with a
 * back button. Desktop keeps the list beside the open section. The URL is the
 * source of truth, so the avatar menu deep-links straight into a section.
 */
export function SettingsView({
  email,
  name,
  aiKeys,
}: {
  email: string;
  name: string | null;
  aiKeys: Record<Provider, KeyStatus>;
}) {
  const searchParams = useSearchParams();
  const section = parseSettingsSection(searchParams.get(SETTINGS_TAB_PARAM));
  const active = section ?? DEFAULT_SETTINGS_TAB;
  // The section last pushed from the phone index: going back to the index
  // from it pops that entry instead of stacking a new one.
  const pushedFromIndex = useRef<SettingsTab | null>(null);
  const tabRefs = useRef(new Map<SettingsTab, HTMLButtonElement>());

  function openSection(tab: SettingsTab) {
    pushedFromIndex.current = tab;
    window.history.pushState(null, "", settingsHref(tab));
    window.scrollTo(0, 0);
  }

  function backToIndex() {
    if (pushedFromIndex.current === section) {
      pushedFromIndex.current = null;
      window.history.back();
      return;
    }
    // Opened straight from a link (the avatar menu): swap the entry so the
    // system back button still leaves settings.
    window.history.replaceState(null, "", SETTINGS_PATH);
    window.scrollTo(0, 0);
  }

  function selectTab(tab: SettingsTab) {
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
    selectTab(next);
    tabRefs.current.get(next)?.focus();
  }

  const panels: Record<SettingsTab, ReactNode> = {
    perfil: <ProfileSection email={email} name={name} />,
    apariencia: <AppearanceSection />,
    seguridad: <PasswordSection />,
    asistente: <AssistantSection keys={aiKeys} />,
    cuenta: <AccountSection email={email} />,
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className={section ? "max-md:hidden" : undefined}>
        <PageHeader
          title="Ajustes"
          description="Tu cuenta y cómo se ve Taskev."
        />
      </div>

      {section === null ? (
        <SettingsIndex email={email} name={name} onOpen={openSection} />
      ) : null}

      <div className="md:grid md:grid-cols-[216px_1fr] md:gap-10">
        <div
          role="tablist"
          aria-label="Secciones de ajustes"
          aria-orientation="vertical"
          onKeyDown={handleKeyDown}
          className="sticky top-24 hidden flex-col gap-1 self-start md:flex"
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
                onClick={() => selectTab(tab.value)}
                className={`flex h-12 items-center gap-3 rounded-xl px-2 text-left font-medium transition-colors ${
                  selected
                    ? "bg-raised text-ink shadow-panel ring-1 ring-line"
                    : "text-muted hover:bg-sunken hover:text-ink"
                }`}
              >
                <SettingsIconTile
                  tab={tab.value}
                  className="size-8 rounded-lg"
                />
                {tab.label}
              </button>
            );
          })}
        </div>

        {SETTINGS_TABS.map((tab) => (
          // Inactive panels stay mounted but hidden so half-typed forms survive
          // a section switch; unhiding also replays the entry animation.
          <div
            key={tab.value}
            role="tabpanel"
            id={`settings-panel-${tab.value}`}
            aria-labelledby={`settings-tab-${tab.value}`}
            hidden={tab.value !== active}
            className={`min-w-0 max-md:animate-push-in md:col-start-2 md:row-start-1 md:max-w-[640px] md:animate-reveal ${
              section === null ? "max-md:hidden" : ""
            }`}
          >
            <header className="mb-5 flex flex-col gap-2 md:mb-6">
              <button
                type="button"
                onClick={backToIndex}
                className="-ml-2.5 flex h-9 w-fit items-center gap-0.5 rounded-full pr-3 pl-1.5 font-medium text-accent transition-colors hover:bg-accent-soft md:hidden"
              >
                <BackIcon />
                Ajustes
              </button>
              <div>
                <h2 className="text-page font-semibold md:text-section">
                  {tab.label}
                </h2>
                <p className="mt-1 text-muted">{tab.description}</p>
              </div>
            </header>
            {panels[tab.value]}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The phone landing screen: who you are, then every section one tap away. */
function SettingsIndex({
  email,
  name,
  onOpen,
}: {
  email: string;
  name: string | null;
  onOpen: (tab: SettingsTab) => void;
}) {
  const { theme } = useTheme();
  const identity = name?.trim() || email;
  const themeLabel = THEME_OPTIONS.find(
    (option) => option.value === theme,
  )?.label;

  return (
    <nav
      aria-label="Secciones de ajustes"
      className="animate-reveal flex flex-col gap-5 md:hidden"
    >
      <button
        type="button"
        onClick={() => onOpen("perfil")}
        className="flex items-center gap-4 rounded-2xl border border-line bg-raised p-4 text-left shadow-panel transition-colors active:bg-sunken"
      >
        <Avatar identity={identity} className="size-14 text-lg" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-semibold">
            {name?.trim() || "Añade tu nombre"}
          </span>
          <span className="block truncate text-meta text-muted">{email}</span>
        </span>
        <ChevronRightIcon className="text-muted" />
      </button>

      <div className="overflow-hidden rounded-2xl border border-line bg-raised shadow-panel">
        {SETTINGS_TABS.filter((tab) => tab.value !== "perfil").map((tab, i) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onOpen(tab.value)}
            className="flex w-full items-center gap-3 pl-4 text-left transition-colors active:bg-sunken"
          >
            <SettingsIconTile tab={tab.value} />
            {/* The divider starts after the icon, like a native grouped list. */}
            <span
              className={`flex min-h-16 min-w-0 flex-1 items-center gap-2 border-line py-3 pr-4 ${
                i > 0 ? "border-t" : ""
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{tab.label}</span>
                <span className="block truncate text-meta text-muted">
                  {tab.description}
                </span>
              </span>
              {tab.value === "apariencia" && themeLabel ? (
                <span className="text-meta text-muted">{themeLabel}</span>
              ) : null}
              <ChevronRightIcon className="text-muted" />
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
