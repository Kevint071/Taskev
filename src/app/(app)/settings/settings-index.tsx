import { SettingsIconTile } from "@/components/settings-icons";
import { useTheme } from "@/components/theme-provider";
import { Avatar } from "@/components/ui/avatar";
import { ChevronRightIcon } from "@/components/ui/icons";
import { SETTINGS_TABS, type SettingsTab } from "@/lib/settings-tabs";
import { THEME_OPTIONS } from "@/lib/theme";

/** The phone landing screen: who you are, then every section one tap away. */
export function SettingsIndex({
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
