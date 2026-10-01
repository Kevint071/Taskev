import Link from "next/link";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NAV, type NavItem } from "./nav-items";

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-9 items-center gap-2.5 rounded-control px-2 font-medium transition-colors ${
        active
          ? "bg-accent-soft text-accent"
          : "text-muted hover:bg-sunken hover:text-ink dark:text-[color-mix(in_srgb,var(--ink)_55%,var(--muted))]"
      }`}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

/** Desktop sidebar. */
export function SideNav({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-58 shrink-0 flex-col border-r border-line bg-raised px-3 py-4 md:flex">
      <Link href="/" className="mb-6 w-fit rounded-control px-2 py-1">
        <Brand />
      </Link>
      <nav aria-label="Principal" className="flex flex-col gap-0.5">
        {NAV.map((item) => (
          <SideLink key={item.href} item={item} active={item.match(pathname)} />
        ))}
      </nav>
      <ThemeToggle compact className="mt-auto w-full" />
    </aside>
  );
}
