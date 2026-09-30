"use client";

import { type AnimationEvent, type CSSProperties, useState } from "react";
import { CloseIcon, TriangleAlertIcon } from "./icons";

export type ToastTone = "warning" | "error" | "success";

export type ToastState = {
  id: number;
  message: string;
  tone?: ToastTone;
} | null;

const TOAST_DURATION_MS = 4000;

/** Own tick (not `CheckIcon`) so the toast's size classes are the only ones applied. */
function SuccessIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 ${className ?? "size-4"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 10.5 8.5 14.5 15.5 6" />
    </svg>
  );
}

/** A circled cross, so it isn't mistaken for the toast's own close button. */
function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 ${className ?? "size-4"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7.5" />
      <path d="m7.5 7.5 5 5m0-5-5 5" />
    </svg>
  );
}

const TONES: Record<
  ToastTone,
  { fill: string; ink: string; Icon: typeof TriangleAlertIcon }
> = {
  warning: {
    fill: "var(--toast-warning)",
    ink: "var(--toast-warning-ink)",
    Icon: TriangleAlertIcon,
  },
  error: {
    fill: "var(--toast-error)",
    ink: "var(--toast-error-ink)",
    Icon: ErrorIcon,
  },
  success: {
    fill: "var(--toast-success)",
    ink: "var(--toast-success-ink)",
    Icon: SuccessIcon,
  },
};

/**
 * A solid, bright notice with dark text sliding in from the right, below the
 * app header; its tone sets the fill and ink. Tapping it, its close button or
 * the end of its visible countdown slides it back out. The countdown holds
 * while the pointer or keyboard focus is on the toast, so it can be read.
 */
export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  // Tracked by id so a new toast never inherits the previous one's exit.
  const [leavingId, setLeavingId] = useState<number | null>(null);
  const [heldId, setHeldId] = useState<number | null>(null);
  const leaving = toast !== null && leavingId === toast.id;
  const held = toast !== null && heldId === toast.id;

  if (!toast) return null;

  const tone = TONES[toast.tone ?? "warning"];

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && leaving) onDismiss();
  }

  // The motion is the toast's feedback, so it opts out of reduced-motion
  // flattening: that rule zeroes durations but keeps delays, which made the
  // staggered parts pop in late on a toast that never slid.
  const hold = () => setHeldId(toast.id);
  const release = () => setHeldId(null);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pointer and focus events only pause the countdown; nothing here is operated
    <div
      key={toast.id}
      data-motion-ok=""
      onAnimationEnd={handleAnimationEnd}
      onMouseEnter={hold}
      onMouseLeave={release}
      onFocus={hold}
      onBlur={release}
      style={{ "--toast": tone.fill, "--toast-ink": tone.ink } as CSSProperties}
      className={`${leaving ? "animate-toast-out" : "animate-toast-in"} fixed top-20 right-3 z-60 w-fit max-w-[min(18rem,calc(100vw-1.5rem))] sm:top-24 sm:right-4 sm:max-w-90`}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: tapping anywhere is a pointer shortcut; the close button is the keyboard path */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: same shortcut */}
      <div
        onClick={() => setLeavingId(toast.id)}
        className="relative flex w-full cursor-pointer touch-manipulation items-start gap-2 overflow-hidden rounded-lg border border-[color-mix(in_srgb,black_10%,var(--toast))] bg-(--toast) px-3.5 py-2.5 text-left text-(--toast-ink) shadow-[0_1px_2px_rgba(15,23,42,0.08),0_10px_28px_-10px_rgba(15,23,42,0.35)] transition-transform duration-150 ease-out active:scale-[0.97] sm:gap-2.5 sm:rounded-xl sm:px-4 sm:py-3 dark:shadow-[0_2px_4px_rgba(0,0,0,0.5),0_18px_40px_-8px_rgba(0,0,0,0.85)]"
      >
        <span className="animate-toast-wiggle mt-0.5 flex">
          <tone.Icon className="size-3.5 sm:size-4" />
        </span>
        <span
          role={toast.tone === "success" ? "status" : "alert"}
          className="animate-toast-text min-w-0 flex-1 text-meta font-medium [--toast-text-delay:60ms] sm:text-ui"
        >
          {toast.message}
        </span>
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={() => setLeavingId(toast.id)}
          className="-my-1 -mr-2 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-black/10 focus-visible:outline-(--toast-ink)"
        >
          <CloseIcon className="size-3.5" />
        </button>
        <span
          aria-hidden="true"
          onAnimationEnd={() => setLeavingId(toast.id)}
          style={{
            animationDuration: `${TOAST_DURATION_MS}ms`,
            animationPlayState: leaving || held ? "paused" : "running",
          }}
          className="animate-toast-countdown absolute inset-x-0 bottom-0 h-0.5 origin-left bg-(--toast-ink) opacity-25"
        />
      </div>
    </div>
  );
}
