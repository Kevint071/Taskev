import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * The landing's call to action: a solid pill with a small arrow that nudges
 * forward on hover. It always keeps its natural width, phone included.
 * `inverse` is for use on top of the accent-colored band.
 */
export function CtaLink({
  href,
  inverse = false,
  children,
}: {
  href: string;
  inverse?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex h-12 items-center justify-center gap-2 rounded-full pr-5 pl-6 text-body font-semibold whitespace-nowrap transition-[transform,box-shadow] duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] ${
        inverse
          ? "bg-accent-ink text-accent shadow-[0_8px_20px_-10px_rgb(0_0_0/0.6)] focus-visible:outline-accent-ink"
          : "bg-accent text-accent-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_6px_16px_-6px_var(--accent)] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_10px_22px_-8px_var(--accent)]"
      }`}
    >
      {children}
      <ArrowRightIcon className="size-[18px] transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

/** The second action next to the main one: same height, outlined instead of filled. */
export function SecondaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-full border border-line-strong bg-raised px-5 text-body font-semibold whitespace-nowrap text-ink transition-[transform,border-color,background-color] duration-200 hover:-translate-y-px hover:border-ink/40 hover:bg-sunken active:translate-y-0 active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}
