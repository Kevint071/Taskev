"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Brand } from "@/components/brand";
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
    match: (p) => p === "/",
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <circle cx="10" cy="10" r="3.2" />
        <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3" />
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "Proyectos",
    match: (p) => p.startsWith("/projects"),
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="M2.8 5.8c0-.9.7-1.6 1.6-1.6h3.3l1.6 1.8h6.3c.9 0 1.6.7 1.6 1.6v6.6c0 .9-.7 1.6-1.6 1.6H4.4c-.9 0-1.6-.7-1.6-1.6V5.8Z" />
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
  const focusScreen = /^\/projects\/[^/]+\/tasks\/[^/]+/.test(pathname);
  const projectDetailScreen = /^\/projects\/[^/]+\/?$/.test(pathname);

  // The focus screen is pinned to the window instead of sized with `h-dvh`:
  // installed Android apps resolve `dvh` too tall on a fresh load (until the
  // next rotation), which pushed the composer below the visible edge.
  return (
    <div
      className={`flex min-w-0 ${
        focusScreen ? "fixed inset-0" : "min-h-dvh flex-1"
      }`}
    >
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-line bg-raised px-3 py-4 md:flex">
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
          className={`flex min-w-0 w-full flex-1 flex-col gap-8 ${
            focusScreen
              ? "min-h-0 overflow-y-auto overscroll-contain px-0 pt-0 pb-0"
              : `mx-auto max-w-[880px] px-4 pb-28 md:px-10 md:pb-16 ${
                  projectDetailScreen ? "pt-4 md:pt-7" : "pt-6 md:pt-10"
                }`
          }`}
        >
          {focusScreen ? (
            <div className="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-8 px-4 pt-3 pb-0 md:px-10 md:pt-10">
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
        className={`fixed inset-x-0 bottom-0 z-10 grid-cols-3 border-t border-line bg-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden ${
          focusScreen ? "hidden" : "grid"
        }`}
      >
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
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
  "flex w-full rounded-control px-3 py-2 text-left text-ui text-muted hover:bg-sunken hover:text-ink";

function UserMenu({ user }: { user: { email: string; name: string | null } }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const identity = user.name?.trim() || user.email;
  const initials = getInitials(identity);
  const color = getAvatarColor(identity);

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
        className="flex size-9 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 focus-visible:outline-offset-2"
        style={{ backgroundColor: color }}
      >
        {initials}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Menú de usuario"
          className="animate-reveal absolute right-0 top-11 z-30 w-56 rounded-panel border border-line bg-raised p-2 shadow-lg"
        >
          <div className="border-b border-line px-3 pb-2 pt-1">
            <p className="truncate text-ui font-medium text-ink">{identity}</p>
            {user.name ? (
              <p className="truncate text-meta text-muted">{user.email}</p>
            ) : null}
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
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getInitials(identity: string) {
  const words = identity.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1)
    return `${words[0][0]}${words.at(-1)?.[0]}`.toUpperCase();
  return identity.slice(0, 2).toUpperCase();
}

function getAvatarColor(identity: string) {
  const normalized = identity
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  let hash = 0;
  for (const character of normalized)
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 58% 42%)`;
}
