export type SettingsTab = "perfil" | "apariencia" | "seguridad" | "cuenta";

export const SETTINGS_TABS: { value: SettingsTab; label: string }[] = [
  { value: "perfil", label: "Perfil" },
  { value: "apariencia", label: "Apariencia" },
  { value: "seguridad", label: "Seguridad" },
  { value: "cuenta", label: "Cuenta" },
];

export const SETTINGS_TAB_PARAM = "seccion";

const DEFAULT_TAB: SettingsTab = "perfil";

/** Falls back to the first tab for missing or unknown query values. */
export function parseSettingsTab(
  value: string | null | undefined,
): SettingsTab {
  return SETTINGS_TABS.some((tab) => tab.value === value)
    ? (value as SettingsTab)
    : DEFAULT_TAB;
}

export function settingsHref(tab: SettingsTab): string {
  return `/settings?${SETTINGS_TAB_PARAM}=${tab}`;
}
