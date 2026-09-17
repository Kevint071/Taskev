import type { ComponentProps } from "react";

export const controlClass =
  "rounded-control border border-line-strong bg-raised text-ink placeholder:text-muted/80 transition-colors hover:border-ink/30 focus-visible:border-accent disabled:opacity-50";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input className={`${controlClass} h-9 px-3 ${className}`} {...props} />
  );
}

export function Textarea({
  className = "",
  ...props
}: ComponentProps<"textarea">) {
  return (
    <textarea
      className={`${controlClass} min-h-20 px-3 py-2 leading-relaxed ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <select
      className={`${controlClass} h-9 cursor-pointer appearance-none pr-7 pl-2.5 ${className}`}
      {...props}
    />
  );
}
