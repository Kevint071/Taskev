"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { TriangleAlertIcon } from "./icons";
import { Input } from "./input";

const TONES = {
  danger: {
    badge: "bg-danger/10 text-danger",
    button: "danger-solid",
  },
  warning: {
    badge:
      "bg-[color-mix(in_srgb,var(--status-paused)_16%,var(--raised))] text-status-paused ring-4 ring-[color-mix(in_srgb,var(--status-paused)_8%,transparent)]",
    button: "primary",
  },
} as const;

/**
 * Native <dialog> confirmation. When `confirmText` is set, the confirm button
 * stays disabled until the user types exactly that text. `tone` switches the
 * destructive red look for a softer warning one. The `stacked` layout centers
 * the icon and text over a full-width `body` and two equal buttons, for
 * dialogs that show what is about to change rather than just ask. With
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
  layout?: "inline" | "stacked";
  /** Full-width content under the title and description. */
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

  const stacked = layout === "stacked";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      data-motion-ok={alwaysAnimate ? "" : undefined}
      className={`animate-dialog-pop m-auto overflow-hidden border border-line bg-raised p-0 text-ink backdrop:animate-backdrop-in backdrop:bg-black/55 backdrop:backdrop-blur-[2px] ${
        stacked
          ? "w-[min(400px,calc(100vw-32px))] rounded-3xl shadow-[0_24px_64px_-16px_rgba(15,23,42,0.45)] dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.9)]"
          : "w-[min(440px,calc(100vw-32px))] translate-y-[6dvh] rounded-[28px] shadow-2xl shadow-black/25"
      }`}
    >
      <form
        method="dialog"
        className={`flex flex-col ${stacked ? "gap-5 p-6 pt-7" : "gap-5 p-6"}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (canConfirm) onConfirm();
        }}
      >
        {stacked ? (
          <div className="flex flex-col items-center gap-3.5 text-center">
            <span
              className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${TONES[tone].badge}`}
            >
              {icon ?? <TriangleAlertIcon className="size-5" />}
            </span>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-[19px] leading-6 font-semibold tracking-[-0.01em]">
                {title}
              </h2>
              <div className="mx-auto max-w-[34ch] text-balance text-muted">
                {description}
              </div>
            </div>
          </div>
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
            </div>
          </div>
        )}
        {body}
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
        {stacked ? (
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-line-strong bg-raised text-ui font-medium text-ink transition-colors hover:bg-sunken"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canConfirm}
              className={`h-11 rounded-xl text-ui font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                tone === "danger"
                  ? "bg-danger text-raised hover:bg-danger/90"
                  : "bg-accent text-accent-ink hover:bg-accent/90"
              }`}
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
