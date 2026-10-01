import Link from "next/link";
import { NAV } from "./nav-items";

/** Mobile tab bar. */
export function TabBar({
  pathname,
  hidden,
}: {
  pathname: string;
  hidden: boolean;
}) {
  return (
    <nav
      aria-label="Principal"
      data-bottom-bar=""
      className={`fixed inset-x-0 bottom-0 z-10 grid-cols-4 border-t border-line bg-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden ${
        hidden ? "hidden" : "grid"
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
  );
}
