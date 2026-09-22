"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/ui/icons";

export type SyncState = "idle" | "saving" | "saved";

const SAVED_VISIBLE_MS = 2000;

/** "Guardando…" while changes are in flight, then a "Cambios guardados" check that fades away. */
export function SyncStatus({ state }: { state: SyncState }) {
  const [savedFaded, setSavedFaded] = useState(false);

  useEffect(() => {
    setSavedFaded(false);
    if (state !== "saved") return;
    const timer = setTimeout(() => setSavedFaded(true), SAVED_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [state]);

  // On phones only the icon shows; the label stays available to screen readers.
  const labelClassName = "sr-only sm:not-sr-only";

  return (
    <p
      aria-live="polite"
      title={
        state === "saving"
          ? "Guardando…"
          : state === "saved"
            ? "Cambios guardados"
            : undefined
      }
      className={`flex items-center gap-1.5 text-meta text-muted transition-opacity duration-500 ${
        state === "saved" && savedFaded ? "opacity-0" : ""
      }`}
    >
      {state === "saving" && (
        <>
          <span
            aria-hidden="true"
            className="animate-syncing size-1.5 rounded-full bg-accent"
          />
          <span className={labelClassName}>Guardando…</span>
        </>
      )}
      {state === "saved" && (
        <>
          <CheckIcon className="text-status-done" />
          <span className={labelClassName}>Cambios guardados</span>
        </>
      )}
    </p>
  );
}
