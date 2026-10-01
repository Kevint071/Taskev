import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { SETTINGS_ICONS } from "@/components/settings-icons";
import { Avatar } from "@/components/ui/avatar";
import { LogOutIcon } from "@/components/ui/icons";
import { Menu } from "@/components/ui/menu";
import { SETTINGS_TABS, settingsHref } from "@/lib/settings-tabs";

// Account deletion stays one step deeper, behind the settings tabs.
const MENU_SETTINGS_TABS = SETTINGS_TABS.filter(
  (tab) => tab.value !== "cuenta",
);

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-ui text-muted hover:bg-sunken hover:text-ink";

/** Avatar button that opens the account menu: settings sections and sign out. */
export function UserMenu({
  user,
}: {
  user: { email: string; name: string | null };
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const identity = user.name?.trim() || user.email;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={`Abrir menú de ${identity}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className="rounded-full shadow-sm transition-transform hover:scale-105 focus-visible:outline-offset-2"
      >
        <Avatar identity={identity} />
      </button>
      {open ? (
        <Menu
          onClose={() => setOpen(false)}
          aria-label="Menú de usuario"
          className="animate-reveal absolute right-0 top-11 z-30 w-56 rounded-panel border border-line bg-raised p-2 shadow-lg"
        >
          <div className="flex items-center gap-2.5 border-b border-line px-2.5 pb-2.5 pt-1">
            <Avatar identity={identity} className="size-8 text-meta" />
            <div className="min-w-0">
              <p className="truncate text-ui font-medium text-ink">
                {identity}
              </p>
              {user.name ? (
                <p className="truncate text-meta text-muted">{user.email}</p>
              ) : null}
            </div>
          </div>
          <div className="border-b border-line py-1">
            {MENU_SETTINGS_TABS.map((tab) => (
              <Link
                key={tab.value}
                href={settingsHref(tab.value)}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={menuItemClass}
              >
                {SETTINGS_ICONS[tab.value]}
                {tab.label}
              </Link>
            ))}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/" })}
            className={`mt-1 ${menuItemClass}`}
          >
            <LogOutIcon className="size-4.5" />
            Cerrar sesión
          </button>
        </Menu>
      ) : null}
    </div>
  );
}
