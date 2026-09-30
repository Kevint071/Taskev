"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Brand } from "@/components/brand";
import { SETTINGS_ICONS } from "@/components/settings-icons";
import { Avatar } from "@/components/ui/avatar";
import { LogOutIcon } from "@/components/ui/icons";
import { Menu } from "@/components/ui/menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SETTINGS_TABS, settingsHref } from "@/lib/settings-tabs";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match: (path: string) => boolean;
};

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

const NAV: NavItem[] = [
  {
    href: "/",
    label: "Hoy",
    // Activity is a page under Hoy.
    match: (p) => p === "/" || p.startsWith("/actividad"),
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <circle cx="10" cy="10" r="3.2" />
        <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3" />
      </svg>
    ),
  },
  {
    href: "/groups",
    label: "Grupos",
    match: (p) => p.startsWith("/groups"),
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <rect x="3" y="3" width="6" height="6" rx="1.6" />
        <rect x="11" y="3" width="6" height="6" rx="1.6" />
        <rect x="3" y="11" width="6" height="6" rx="1.6" />
        <rect x="11" y="11" width="6" height="6" rx="1.6" />
      </svg>
    ),
  },
  {
    href: "/tasks",
    label: "Tareas",
    match: (p) => p.startsWith("/tasks"),
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="m3.5 5.5 1.4 1.4 2.4-2.6M3.5 13.5l1.4 1.4 2.4-2.6M10 6h6.5M10 14h6.5" />
      </svg>
    ),
  },
  {
    href: "/asistente",
    label: "Asistente",
    match: (p) => p.startsWith("/asistente"),
    icon: SETTINGS_ICONS.asistente,
  },
];

export function AppShell({
  user,
  children,
}: {
  user: { email: string; name: string | null };
  children: ReactNode;
}) {
  const pathname = usePathname();
  // A single task is a focus screen: it pins its own composer to the bottom
  // edge, so the phone tab bar steps aside.
  const focusScreen = /^\/groups\/[^/]+\/tasks\/[^/]+/.test(pathname);
  const groupDetailScreen = /^\/groups\/[^/]+\/?$/.test(pathname);
  // The assistant is pinned to the window like the focus screen: the
  // transcript scrolls inside it, so the composer never moves with the page.
  // On desktop its conversation list also sits flush against the right edge.
  const chatScreen = pathname.startsWith("/asistente");
  // While the phone keyboard is up the tab bar would ride on top of it, so it
  // steps aside on the chat screen.
  const keyboardOpen = useKeyboardOpen(chatScreen);
  const hideTabBar = focusScreen || (chatScreen && keyboardOpen);

  // The focus screen is pinned to the window instead of sized with `h-dvh`:
  // installed Android apps resolve `dvh` too tall on a fresh load (until the
  // next rotation), which pushed the composer below the visible edge.
  return (
    <div
      className={`flex min-w-0 ${
        focusScreen || chatScreen ? "fixed inset-0" : "min-h-dvh flex-1"
      }`}
    >
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-70 focus:rounded-control focus:bg-raised focus:px-3 focus:py-2 focus:font-medium focus:text-ink focus:shadow-lg"
      >
        Saltar al contenido
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-58 shrink-0 flex-col border-r border-line bg-raised px-3 py-4 md:flex">
        <Link href="/" className="mb-6 w-fit rounded-control px-2 py-1">
          <Brand />
        </Link>
        <nav aria-label="Principal" className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <SideLink
              key={item.href}
              item={item}
              active={item.match(pathname)}
            />
          ))}
        </nav>
        <ThemeToggle compact className="mt-auto w-full" />
      </aside>

      <div className="flex min-w-0 min-h-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-end border-b border-line bg-surface/90 px-4 backdrop-blur md:px-10">
          <Link
            href="/"
            className="absolute left-4 top-1/2 flex h-7 -translate-y-1/2 items-center rounded-control md:hidden"
          >
            <Brand />
          </Link>
          <UserMenu user={user} />
        </header>

        <main
          id="contenido"
          tabIndex={-1}
          className={`flex min-w-0 w-full flex-1 flex-col gap-8 focus:outline-none ${
            focusScreen
              ? "min-h-0 overflow-y-auto overscroll-contain px-0 pt-0 pb-0"
              : chatScreen
                ? `min-h-0 overflow-y-auto overscroll-contain p-0 md:pb-0 ${
                    keyboardOpen
                      ? "pb-0"
                      : "pb-[calc(4rem+env(safe-area-inset-bottom))]"
                  }`
                : `mx-auto max-w-220 px-4 pb-28 md:px-10 md:pb-16 ${
                    groupDetailScreen ? "pt-4 md:pt-7" : "pt-6 md:pt-10"
                  }`
          }`}
        >
          {focusScreen ? (
            <div className="mx-auto flex w-full max-w-220 flex-1 flex-col gap-8 px-4 pt-3 pb-0 md:px-10 md:pt-10">
              {children}
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav
        aria-label="Principal"
        data-bottom-bar=""
        className={`fixed inset-x-0 bottom-0 z-10 grid-cols-4 border-t border-line bg-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden ${
          hideTabBar ? "hidden" : "grid"
        }`}
      >
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-16 flex-col items-center justify-center gap-1 text-[0.75rem] font-medium ${
                active ? "text-ink" : "text-muted"
              }`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full ${
                  active ? "bg-accent-soft text-accent" : ""
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function isTextField(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.matches("textarea, input:not([type=checkbox], [type=radio])") ||
      target.isContentEditable)
  );
}

// Smallest shrink of the viewport that counts as a keyboard, so a collapsing
// browser toolbar is not mistaken for one.
const KEYBOARD_MIN_HEIGHT_PX = 150;

// True while a phone's on-screen keyboard is showing. Focus alone is not
// enough: the Android back gesture hides the keyboard but leaves the field
// focused, so the viewport height is what says whether it is really open.
function useKeyboardOpen(enabled: boolean) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setOpen(false);
      return;
    }
    const viewport = window.visualViewport;
    // Tallest viewport seen at the current width, i.e. with no keyboard.
    let baseline = { width: window.innerWidth, height: 0 };

    function update() {
      const width = window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      baseline =
        width === baseline.width
          ? { width, height: Math.max(baseline.height, height) }
          : { width, height };
      setOpen(
        isTextField(document.activeElement) &&
          baseline.height - height > KEYBOARD_MIN_HEIGHT_PX,
      );
    }

    update();
    const target = viewport ?? window;
    target.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      target.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, [enabled]);

  return open;
}

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-9 items-center gap-2.5 rounded-control px-2 font-medium transition-colors ${
        active
          ? "bg-accent-soft text-accent"
          : "text-muted hover:bg-sunken hover:text-ink"
      }`}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

// Account deletion stays one step deeper, behind the settings tabs.
const MENU_SETTINGS_TABS = SETTINGS_TABS.filter(
  (tab) => tab.value !== "cuenta",
);

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-ui text-muted hover:bg-sunken hover:text-ink";

function UserMenu({ user }: { user: { email: string; name: string | null } }) {
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
