import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";

type ControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

/**
 * Label + control + optional hint/error, stacked. The label points at the
 * control by id, and the hint or error is linked with `aria-describedby`, so
 * neither leaks into the control's accessible name.
 */
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
  /** A single control element; it receives the id and aria wiring. */
  children: ReactElement<ControlProps>;
  className?: string;
}) {
  const generatedId = useId();
  const controlId = isValidElement<ControlProps>(children)
    ? (children.props.id ?? generatedId)
    : generatedId;
  const noteId = `${controlId}-note`;
  const hasNote = Boolean(error || hint);

  const control = isValidElement<ControlProps>(children)
    ? cloneElement(children, {
        id: controlId,
        "aria-describedby": hasNote
          ? [children.props["aria-describedby"], noteId]
              .filter(Boolean)
              .join(" ")
          : children.props["aria-describedby"],
        "aria-invalid": error ? true : children.props["aria-invalid"],
      })
    : children;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={controlId} className="text-meta font-medium text-muted">
        {label}
      </label>
      {control}
      {error ? (
        <span id={noteId} role="alert" className="text-meta text-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={noteId} className="text-meta text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      key={message}
      role="alert"
      data-motion-ok=""
      className="animate-shake text-meta font-semibold text-danger"
    >
      {message}
    </p>
  );
}
