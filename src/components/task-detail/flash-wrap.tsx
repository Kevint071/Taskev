import { type ReactNode, useEffect, useRef, useState } from "react";

export type FlashKey =
  | "title"
  | "progress"
  | "priority"
  | "dueDate"
  | "completedAt"
  | "description";

const NO_FLASH: Record<FlashKey, number> = {
  title: 0,
  progress: 0,
  priority: 0,
  dueDate: 0,
  completedAt: 0,
  description: 0,
};

/** One counter per field; bumping it replays that field's saved highlight. */
export function useFlash() {
  const [flash, setFlash] = useState(NO_FLASH);

  function bumpFlash(key: FlashKey) {
    setFlash((f) => ({ ...f, [key]: f[key] + 1 }));
  }

  return { flash, bumpFlash };
}

/** Wraps a field so it can briefly highlight right after a change is confirmed saved. */
export function FlashWrap({
  tick,
  className = "rounded-control border-transparent",
  children,
}: {
  tick: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Restart the animation in place: remounting (e.g. via `key`) would drop the
  // inline height of autosized textareas and any focus inside.
  useEffect(() => {
    const el = ref.current;
    if (!el || tick === 0) return;
    el.classList.remove("animate-saved-flash");
    void el.offsetWidth;
    el.classList.add("animate-saved-flash");
  }, [tick]);

  return (
    <div
      ref={ref}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) {
          e.currentTarget.classList.remove("animate-saved-flash");
        }
      }}
      className={`border ${className}`}
    >
      {children}
    </div>
  );
}
