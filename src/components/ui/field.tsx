import type { ReactNode } from "react";

/** Label + control + optional hint/error, stacked. */
export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is passed in as children
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-meta font-medium text-muted">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="text-meta text-danger">
          {error}
        </span>
      ) : hint ? (
        <span className="text-meta text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-control border border-danger/30 bg-danger/10 px-3 py-2 text-danger"
    >
      {message}
    </p>
  );
}
