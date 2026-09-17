"use client";

import { useEffect } from "react";

export type ToastState = { id: number; message: string } | null;

const TOAST_DURATION_MS = 2600;

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      key={toast.id}
      role="alert"
      aria-live="assertive"
      className="animate-toast-in fixed top-4 right-4 z-50 max-w-sm rounded-control border border-line-strong bg-raised px-4 py-3 text-ui text-ink shadow-panel"
    >
      {toast.message}
    </div>
  );
}
