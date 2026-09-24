"use client";

import {
  type AnimationEvent,
  type CSSProperties,
  useEffect,
  useState,
} from "react";
import { CloseIcon, TriangleAlertIcon } from "./icons";

export type ToastTone = "warning" | "error";

export type ToastState = {
  id: number;
  message: string;
  tone?: ToastTone;
} | null;

const TOAST_DURATION_MS = 4000;

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
    Icon: CloseIcon,
  },
};

/**
 * A solid, bright notice with dark text sliding in from the right, below the
 * app header; its tone sets the fill and ink. Tapping it, or the end of its
 * visible countdown, slides it back out; hovering changes nothing.
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
  const leaving = toast !== null && leavingId === toast.id;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setLeavingId(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const tone = TONES[toast.tone ?? "warning"];

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && leaving) onDismiss();
  }

  // The motion is the toast's feedback, so it opts out of reduced-motion
  // flattening: that rule zeroes durations but keeps delays, which made the
  // staggered parts pop in late on a toast that never slid.
  return (
    <div
      key={toast.id}
      role="alert"
      aria-live="assertive"
      data-motion-ok=""
      onAnimationEnd={handleAnimationEnd}
      style={{ "--toast": tone.fill, "--toast-ink": tone.ink } as CSSProperties}
      className={`${leaving ? "animate-toast-out" : "animate-toast-in"} fixed top-20 right-3 z-60 w-fit max-w-[min(18rem,calc(100vw-1.5rem))] sm:top-24 sm:right-4 sm:max-w-[22.5rem]`}
    >
      <button
        type="button"
        title="Toca para cerrar"
        onClick={() => setLeavingId(toast.id)}
        className="relative flex w-full cursor-pointer touch-manipulation items-start gap-2 overflow-hidden rounded-lg border border-[color-mix(in_srgb,black_10%,var(--toast))] bg-(--toast) px-3.5 py-2.5 text-left text-(--toast-ink) shadow-[0_1px_2px_rgba(15,23,42,0.08),0_10px_28px_-10px_rgba(15,23,42,0.35)] transition-transform duration-150 ease-out active:scale-[0.97] sm:gap-2.5 sm:rounded-xl sm:px-4 sm:py-3 dark:shadow-[0_2px_4px_rgba(0,0,0,0.5),0_18px_40px_-8px_rgba(0,0,0,0.85)]"
      >
        <span className="animate-toast-wiggle mt-0.5 flex">
          <tone.Icon className="size-3.5 sm:size-4" />
        </span>
        <span className="animate-toast-text text-meta font-medium [--toast-text-delay:60ms] sm:text-ui">
          {toast.message}
        </span>
        <span
          aria-hidden="true"
          style={{
            animationDuration: `${TOAST_DURATION_MS}ms`,
            animationPlayState: leaving ? "paused" : "running",
          }}
          className="animate-toast-countdown absolute inset-x-0 bottom-0 h-0.5 origin-left bg-(--toast-ink) opacity-25"
        />
      </button>
    </div>
  );
}
