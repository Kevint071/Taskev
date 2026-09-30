"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * Wraps a trigger and its floating panel; closes on outside click or Escape.
 * Escape returns focus to the trigger, found by its `aria-expanded="true"`.
 */
export function Popover({
  open,
  onClose,
  className = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Focus goes back to whatever opened the panel before it unmounts.
      ref.current
        ?.querySelector<HTMLElement>('[aria-expanded="true"]')
        ?.focus();
      onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {children}
    </div>
  );
}
