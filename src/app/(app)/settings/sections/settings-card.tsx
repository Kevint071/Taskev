import type { ReactNode } from "react";
import { CheckIcon } from "@/components/ui/icons";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-line bg-raised shadow-panel ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
}: {
  title: string;
  description: ReactNode;
}) {
  return (
    <div className="px-5 pt-5">
      <h3 className="text-body font-semibold">{title}</h3>
      <p className="mt-0.5 text-muted">{description}</p>
    </div>
  );
}

/** Tinted bar closing a form card: status on the left, actions on the right. */
export function CardFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-14 flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-line bg-sunken/60 px-5 py-2.5">
      {children}
    </div>
  );
}

export function Saved({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <output className="animate-caption-in mr-auto flex items-center gap-1.5 text-meta font-medium text-status-done">
      <span className="flex size-4 items-center justify-center rounded-full bg-status-done text-raised">
        <CheckIcon className="size-3" />
      </span>
      {message}
    </output>
  );
}

/** A card row with an icon tile, a title and a short line, plus an action. */
export function ActionRow({
  icon,
  title,
  description,
  tone = "default",
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  const danger = tone === "danger";
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-4 p-5 sm:grid-cols-[auto_1fr_auto]">
      <span
        className={`flex size-9 items-center justify-center rounded-xl ${
          danger ? "bg-danger/10 text-danger" : "bg-sunken text-muted"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className={`font-medium ${danger ? "text-danger" : ""}`}>{title}</p>
        <p className="text-meta text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
