"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "./button";
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
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-panel border border-line bg-raised p-0 text-ink shadow-2xl shadow-black/20 backdrop:bg-black/50"
    >
      <form
        method="dialog"
        className="flex flex-col gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (canConfirm) onConfirm();
        }}
      >
        <h2 className="text-section font-semibold">{title}</h2>
        <div className="text-muted">{description}</div>
        {confirmText !== undefined && (
          // biome-ignore lint/a11y/noLabelWithoutControl: wraps the Input component
          <label className="flex flex-col gap-1.5">
            <span className="text-meta text-muted">{confirmTextLabel}</span>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        )}
        <div className="flex justify-end gap-2 pt-1">
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
