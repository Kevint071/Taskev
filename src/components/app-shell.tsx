"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
  {
    href: "/settings",
    label: "Ajustes",
    match: (p) => p.startsWith("/settings"),
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="M4 6h7M15 6h1M4 14h1M9 14h7" />
        <circle cx="13" cy="6" r="1.9" />
        <circle cx="7" cy="14" r="1.9" />
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
  const displayName = user.name ?? user.email;

  return (
    <div className="flex min-h-dvh flex-1">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-line bg-raised px-3 py-4 md:flex">
        <Link href="/" className="mb-6 w-fit rounded-control px-2 py-1">
          <Brand />
        </Link>
        <nav aria-label="Principal" className="flex flex-col gap-0.5">
          {NAV.slice(0, 3).map((item) => (
            <SideLink
              key={item.href}
              item={item}
              active={item.match(pathname)}
            />
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <div className="border-t border-line pt-3">
            <SideLink item={NAV[3]} active={NAV[3].match(pathname)} />
          </div>
          <ThemeToggle compact className="w-full" />
          <div className="flex items-center justify-between gap-2 px-2">
            <span
              className="min-w-0 truncate text-meta font-medium"
              title={user.email}
            >
              {displayName}
            </span>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur md:hidden">
          <Link href="/" className="rounded-control">
            <Brand />
          </Link>
          <SignOutButton />
        </header>

        <main className="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-8 px-4 pt-6 pb-28 md:px-10 md:pt-10 md:pb-16">
          {children}
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-line bg-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
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

function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="shrink-0 rounded-control px-2 py-1 text-meta text-muted hover:bg-sunken hover:text-ink"
    >
      Cerrar sesión
    </button>
  );
}
