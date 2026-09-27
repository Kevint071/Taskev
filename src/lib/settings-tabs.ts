export type SettingsTab = "perfil" | "apariencia" | "seguridad" | "cuenta";

export const SETTINGS_TABS: {
  value: SettingsTab;
  label: string;
  description: string;
}[] = [
  { value: "perfil", label: "Perfil", description: "Tu nombre y tu correo" },
  {
    value: "apariencia",
    label: "Apariencia",
    description: "Tema claro, oscuro o del sistema",
  },
  {
    value: "seguridad",
    label: "Seguridad",
    description: "Contraseña de acceso",
  },
  {
    value: "cuenta",
    label: "Cuenta",
    description: "Cerrar sesión o eliminar la cuenta",
  },
];

export const SETTINGS_PATH = "/settings";

export const SETTINGS_TAB_PARAM = "seccion";

/** Shown beside the section list on desktop when the URL names none. */
export const DEFAULT_SETTINGS_TAB: SettingsTab = "perfil";

/**
 * Null for missing or unknown query values: phones then show the section
 * index instead of opening one.
 */
export function parseSettingsSection(
  value: string | null | undefined,
): SettingsTab | null {
  return SETTINGS_TABS.some((tab) => tab.value === value)
    ? (value as SettingsTab)
    : null;
}

export function settingsHref(tab: SettingsTab): string {
  return `${SETTINGS_PATH}?${SETTINGS_TAB_PARAM}=${tab}`;
}
