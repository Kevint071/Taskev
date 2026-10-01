"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { BackIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/panel";
import type { Provider } from "@/lib/ai/provider";
import {
  DEFAULT_SETTINGS_TAB,
  parseSettingsSection,
  SETTINGS_TAB_PARAM,
  SETTINGS_TABS,
  type SettingsTab,
} from "@/lib/settings-tabs";
import { AccountSection } from "./sections/account-section";
import { AppearanceSection } from "./sections/appearance-section";
import { AssistantSection } from "./sections/assistant-section";
import type { KeyStatus } from "./sections/key-providers";
import { PasswordSection } from "./sections/password-section";
import { ProfileSection } from "./sections/profile-section";
import { SettingsIndex } from "./settings-index";
import { SettingsTabBar } from "./settings-tab-bar";
import { useSettingsNavigation } from "./use-settings-navigation";

/**
 * Phones drill down: a section index, then one section per screen with a
 * back button. Desktop shows the sections as tabs above the open one. The URL is the
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
  const { openSection, backToIndex, selectTab } =
    useSettingsNavigation(section);

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

      <div className="md:flex md:flex-col md:gap-6">
        <SettingsTabBar active={active} onSelect={selectTab} />

        {SETTINGS_TABS.map((tab) => (
          // Inactive panels stay mounted but hidden so half-typed forms survive
          // a section switch; unhiding also replays the entry animation.
          <div
            key={tab.value}
            role="tabpanel"
            id={`settings-panel-${tab.value}`}
            aria-labelledby={`settings-tab-${tab.value}`}
            hidden={tab.value !== active}
            className={`min-w-0 max-md:animate-push-in md:animate-reveal ${
              section === null ? "max-md:hidden" : ""
            }`}
          >
            {/* Phones only: on desktop the active tab already names the section. */}
            <header className="mb-5 flex flex-col gap-2 md:hidden">
              <button
                type="button"
                onClick={backToIndex}
                className="-ml-2.5 flex h-9 w-fit items-center gap-0.5 rounded-full pr-3 pl-1.5 font-medium text-accent transition-colors hover:bg-accent-soft md:hidden"
              >
                <BackIcon />
                Ajustes
              </button>
              <div>
                <h2 className="text-page font-semibold">{tab.label}</h2>
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
