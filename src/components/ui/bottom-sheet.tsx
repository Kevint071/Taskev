"use client";

import {
  type PointerEvent,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
import { CloseIcon } from "./icons";

const DISMISS_DISTANCE = 96;
const DISMISS_VELOCITY = 0.5; // px per ms
const DISMISS_MS = 180;

/**
 * Native <dialog> that rises from the bottom edge on phones and sits centred
 * on wider screens. It hosts one contextual control at a time, so the page
 * behind stays free of inputs until the user asks to change something. On
 * phones the handle and title bar can be dragged down to dismiss it.
 */
export function BottomSheet({
  open,
  title,
  onClose,
  showClose = true,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Whether the title bar shows a close button; drag and backdrop still close. */
  showClose?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // A drag that starts inside (a slider thumb) and ends over the backdrop
  // reports the dialog as the click target, so only close on a full backdrop tap.
  const pressedBackdrop = useRef(false);
  const drag = useRef<{
    id: number;
    startY: number;
    startTime: number;
    active: boolean;
  } | null>(null);

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
    // A swipe-dismissed sheet is left translated off-screen; reset it so the
    // next opening starts in place.
    dialog.style.transition = "";
    dialog.style.transform = "";
  }, [open]);

  function startDrag(e: PointerEvent<HTMLDivElement>) {
    // Centred on wider screens, where there is nothing to swipe away.
    if (window.matchMedia("(min-width: 640px)").matches) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = {
      id: e.pointerId,
      startY: e.clientY,
      startTime: e.timeStamp,
      active: false,
    };
  }

  function moveDrag(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const dialog = ref.current;
    if (!d || d.id !== e.pointerId || !dialog) return;
    const dy = e.clientY - d.startY;
    if (!d.active) {
      // Capture only once it is a real drag, so taps still reach the buttons.
      if (Math.abs(dy) < 4) return;
      d.active = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    dialog.style.transition = "none";
    dialog.style.transform = `translateY(${Math.max(0, dy)}px)`;
  }

  function endDrag(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const dialog = ref.current;
    drag.current = null;
    if (!d || !d.active || !dialog) return;
    const dy = Math.max(0, e.clientY - d.startY);
    const velocity = dy / Math.max(1, e.timeStamp - d.startTime);
    dialog.style.transition = `transform ${DISMISS_MS}ms ease-out`;
    if (dy > DISMISS_DISTANCE || (velocity > DISMISS_VELOCITY && dy > 24)) {
      dialog.style.transform = "translateY(100%)";
      window.setTimeout(onClose, DISMISS_MS);
    } else {
      dialog.style.transform = "";
    }
  }

  function cancelDrag() {
    const dialog = ref.current;
    if (drag.current?.active && dialog) {
      dialog.style.transition = `transform ${DISMISS_MS}ms ease-out`;
      dialog.style.transform = "";
    }
    drag.current = null;
  }

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
      className="animate-sheet-up m-0 mt-auto outline-none w-full max-w-none overflow-hidden rounded-t-3xl border-0 bg-raised p-0 text-ink shadow-2xl shadow-black/20 backdrop:bg-black/45 sm:m-auto sm:max-w-110 sm:rounded-3xl"
    >
      <div className="flex max-h-[88dvh] flex-col">
        <div
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={cancelDrag}
          className="touch-none"
        >
          <div
            aria-hidden="true"
            className="flex justify-center pt-2 pb-1 sm:hidden"
          >
            <span className="h-1 w-9 rounded-full bg-line-strong" />
          </div>
          <div className="flex items-center justify-between gap-3 px-5 pt-2 pb-2 sm:pt-5">
            <h2 id={titleId} className="text-[17px] leading-6 font-semibold">
              {title}
            </h2>
            {showClose ? (
              <button
                type="button"
                aria-label="Cerrar"
                onClick={onClose}
                className="-mr-2 flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink"
              >
                <CloseIcon />
              </button>
            ) : null}
          </div>
        </div>
        <div className="overflow-y-auto px-4 pt-1 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </dialog>
  );
}
