"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { TriangleAlertIcon } from "./icons";
import { Input } from "./input";

/**
 * Native <dialog> confirmation. When `confirmText` is set, the confirm button
 * stays disabled until the user types exactly that text.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmText,
  confirmTextLabel,
  pending = false,
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

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      className="animate-dialog-pop m-auto w-[min(440px,calc(100vw-32px))] translate-y-[6dvh] overflow-hidden rounded-[28px] border border-line bg-raised p-0 text-ink shadow-2xl shadow-black/25 backdrop:animate-backdrop-in backdrop:bg-black/55 backdrop:backdrop-blur-[2px]"
    >
      <form
        method="dialog"
        className="flex flex-col gap-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (canConfirm) onConfirm();
        }}
      >
        <div className="flex items-start gap-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
            <TriangleAlertIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <h2 className="text-section font-semibold">{title}</h2>
            <div className="mt-1 text-muted">{description}</div>
          </div>
        </div>
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
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger-solid" disabled={!canConfirm}>
            {pending ? "Un momento…" : confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
