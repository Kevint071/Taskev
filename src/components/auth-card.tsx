import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";

/** Centered 360px column used by the login and register screens. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col px-4 py-6">
      <Link href="/" className="w-fit" aria-label="Taskev, ir al inicio">
        <Brand />
      </Link>
      <div className="mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center gap-6 py-12">
        <div>
          <h1 className="text-page font-semibold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="text-muted">{footer}</div>}
      </div>
    </main>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
    >
      {children}
    </Link>
  );
}
