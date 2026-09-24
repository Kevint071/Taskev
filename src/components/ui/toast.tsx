"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { CloseIcon, TriangleAlertIcon } from "./icons";

export type ToastState = { id: number; message: string } | null;

const TOAST_DURATION_MS = 4000;

/**
 * A tinted notice dropping in at the top. It closes itself after a visible
 * countdown, which pauses while the pointer rests on it.
 */
export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(TOAST_DURATION_MS);

  // Declared before the timer effect so a new toast starts from full time.
  // biome-ignore lint/correctness/useExhaustiveDependencies: A new toast id restarts the countdown.
  useEffect(() => {
    remaining.current = TOAST_DURATION_MS;
    setPaused(false);
  }, [toast?.id]);

  useEffect(() => {
    if (!toast || paused) return;
    const startedAt = Date.now();
    const timer = setTimeout(onDismiss, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt;
    };
  }, [toast, paused, onDismiss]);

  if (!toast) return null;

  return (
    <div
      key={toast.id}
      role="alert"
      aria-live="assertive"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ "--toast": "var(--status-paused)" } as CSSProperties}
      className="animate-toast-in fixed top-4 right-4 left-4 z-60 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--toast)_35%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--toast)_24%,var(--raised)),color-mix(in_srgb,var(--toast)_7%,var(--raised))_70%)] shadow-[0_12px_32px_-8px_color-mix(in_srgb,var(--toast)_45%,transparent)] sm:left-auto sm:w-[380px]"
    >
      <div className="flex items-start gap-3 py-3 pr-2 pl-3.5">
        <span className="animate-toast-icon flex size-8 shrink-0 items-center justify-center rounded-full bg-(--toast) text-accent-ink shadow-[0_0_0_4px_color-mix(in_srgb,var(--toast)_18%,transparent)]">
          <TriangleAlertIcon className="size-4" />
        </span>
        <p className="min-w-0 flex-1 py-1.5 text-ui font-medium text-ink">
          {toast.message}
        </p>
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={onDismiss}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--toast)_16%,transparent)] hover:text-ink"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>
      <span
        aria-hidden="true"
        style={{
          animationDuration: `${TOAST_DURATION_MS}ms`,
          animationPlayState: paused ? "paused" : "running",
        }}
        className="animate-toast-countdown absolute inset-x-0 bottom-0 h-[3px] origin-left bg-(--toast)"
      />
    </div>
  );
}
