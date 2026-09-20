"use client";

import { type ReactNode, useId, useLayoutEffect, useRef } from "react";
import { CloseIcon } from "./icons";

/**
 * Native <dialog> that rises from the bottom edge on phones and sits centred
 * on wider screens. It hosts one contextual control at a time, so the page
 * behind stays free of inputs until the user asks to change something.
 */
export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // A drag that starts inside (a slider thumb) and ends over the backdrop
  // reports the dialog as the click target, so only close on a full backdrop tap.
  const pressedBackdrop = useRef(false);

  // Layout timing so a closing sheet hides before its emptied content paints.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal() lands on the first control, which would be the close button.
      dialog.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the backdrop tap is a pointer shortcut; Escape already closes via onCancel
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      tabIndex={-1}
      onClose={onClose}
      onCancel={onClose}
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedBackdrop.current) onClose();
      }}
      className="animate-sheet-up m-0 mt-auto outline-none w-full max-w-none overflow-hidden rounded-t-3xl border-0 bg-raised p-0 text-ink shadow-2xl shadow-black/20 backdrop:bg-black/45 sm:m-auto sm:max-w-[440px] sm:rounded-3xl"
    >
      <div className="flex max-h-[88dvh] flex-col">
        <div aria-hidden="true" className="flex justify-center pt-2 sm:hidden">
          <span className="h-1 w-9 rounded-full bg-line-strong" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2 sm:pt-5">
          <h2 id={titleId} className="text-[17px] leading-6 font-semibold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="-mr-2 flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pt-1 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </dialog>
  );
}
