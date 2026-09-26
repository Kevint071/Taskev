"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { TriangleAlertIcon } from "./icons";
import { Input } from "./input";

const TONES = {
  danger: {
    badge: "bg-danger/10 text-danger",
    button: "danger-solid",
    compactBadge: "bg-danger/10 text-danger",
    compactButton: "bg-danger text-raised hover:bg-danger/90",
  },
  warning: {
    badge:
      "bg-[color-mix(in_srgb,var(--status-paused)_16%,var(--raised))] text-status-paused ring-4 ring-[color-mix(in_srgb,var(--status-paused)_8%,transparent)]",
    button: "primary",
    compactBadge:
      "bg-[color-mix(in_srgb,var(--status-paused)_15%,var(--raised))] text-status-paused",
    compactButton: "bg-ink text-raised hover:bg-ink/85",
  },
} as const;

/**
 * Native <dialog> confirmation. When `confirmText` is set, the confirm button
 * stays disabled until the user types exactly that text. `tone` switches the
 * destructive red look for a softer warning one. The `compact` layout is a
 * small card for quick, low-stakes questions: icon beside the title, an
 * optional full-width `body`, a short description and pill buttons. With
 * `alwaysAnimate`, its motion plays even under reduced-motion settings.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmText,
  confirmTextLabel,
  pending = false,
  tone = "danger",
  icon,
  layout = "inline",
  body,
  alwaysAnimate = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  confirmText?: string;
  confirmTextLabel?: ReactNode;
  pending?: boolean;
  tone?: keyof typeof TONES;
  /** Replaces the default alert icon in the badge. */
  icon?: ReactNode;
  layout?: "inline" | "compact";
  /** Full-width content between the title and the description. */
  body?: ReactNode;
  alwaysAnimate?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setTyped("");
      // showModal() restores focus to the opener when the dialog closes.
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const canConfirm =
    !pending && (confirmText === undefined || typed === confirmText);

  const compact = layout === "compact";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      data-motion-ok={alwaysAnimate ? "" : undefined}
      className={`animate-dialog-pop m-auto overflow-hidden border border-line bg-raised p-0 text-ink backdrop:animate-backdrop-in backdrop:bg-black/55 backdrop:backdrop-blur-[2px] ${
        compact
          ? "w-[min(320px,calc(100vw-32px))] rounded-[20px] shadow-[0_20px_50px_-12px_rgba(15,23,42,0.45)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.9)]"
          : "w-[min(440px,calc(100vw-32px))] translate-y-[6dvh] rounded-[28px] shadow-2xl shadow-black/25"
      }`}
    >
      <form
        method="dialog"
        className={compact ? "flex flex-col p-4" : "flex flex-col gap-5 p-6"}
        onSubmit={(e) => {
          e.preventDefault();
          if (canConfirm) onConfirm();
        }}
      >
        {compact ? (
          <>
            <div className="flex items-center gap-2.5">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${TONES[tone].compactBadge}`}
              >
                {icon ?? <TriangleAlertIcon className="size-4" />}
              </span>
              <h2 className="min-w-0 text-[15px] leading-5 font-semibold">
                {title}
              </h2>
            </div>
            {body && <div className="mt-3">{body}</div>}
            <div
              className={`text-meta text-muted ${body ? "mt-1.5" : "mt-2.5"}`}
            >
              {description}
            </div>
          </>
        ) : (
          <div className="flex items-start gap-3.5">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${TONES[tone].badge}`}
            >
              {icon ?? <TriangleAlertIcon className="size-5" />}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <h2 className="text-section font-semibold">{title}</h2>
              <div className="mt-1 text-muted">{description}</div>
              {body && <div className="mt-3">{body}</div>}
            </div>
          </div>
        )}
        {confirmText !== undefined && (
          // biome-ignore lint/a11y/noLabelWithoutControl: wraps the Input component
          <label className="flex flex-col gap-1.5 pl-[calc(2.5rem+0.875rem)]">
            <span className="text-meta text-muted">{confirmTextLabel}</span>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        )}
        {compact ? (
          <div className="mt-4 flex justify-end gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-full px-3.5 text-meta font-medium text-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canConfirm}
              className={`h-8 rounded-full px-3.5 text-meta font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${TONES[tone].compactButton}`}
            >
              {pending ? "Un momento…" : confirmLabel}
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={TONES[tone].button}
              disabled={!canConfirm}
            >
              {pending ? "Un momento…" : confirmLabel}
            </Button>
          </div>
        )}
      </form>
    </dialog>
  );
}
