import { useEffect, useRef, useState } from "react";
import { CHIPS, COUNT, type Frame, START } from "./task-flow-data";

/**
 * Drives the task-flow story: one pass scatters the tasks, sorts them, works
 * on the first and completes it; when it leaves, the next pass starts. It
 * only runs while the figure is on screen and not paused.
 */
export function useTaskFlow() {
  const rootRef = useRef<HTMLElement>(null);
  const [frame, setFrame] = useState<Frame>(START);
  const [onScreen, setOnScreen] = useState(false);
  const [paused, setPaused] = useState(false);

  const playing = onScreen && !paused;

  // Runs on its own, but only while it is on screen.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) =>
      setOnScreen(entry.isIntersecting),
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // One pass of the story: the tasks scatter, get sorted, the first one is
  // worked on and completed, and it leaves (which starts the next pass).
  useEffect(() => {
    if (!playing) return;
    const k = frame.k;
    const from = CHIPS[k % COUNT].progress;
    const timers: number[] = [];
    let raf = 0;
    const at = (ms: number, run: () => void) => {
      timers.push(window.setTimeout(run, ms));
    };
    const patch = (next: Partial<Frame>) =>
      setFrame((current) => ({ ...current, ...next }));

    // The very first pass opens already sorted.
    const sorted = k === 0 ? 0 : 2100;
    patch({ phase: k === 0 ? "order" : "chaos", pct: null });
    if (k > 0) at(sorted, () => patch({ phase: "order" }));

    at(sorted + 1800, () => {
      patch({ phase: "work" });
      const startedAt = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - startedAt) / 1200);
        patch({ pct: Math.round(from + (100 - from) * (1 - (1 - t) ** 3)) });
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    at(sorted + 3300, () => patch({ phase: "done", pct: 100 }));
    at(sorted + 4800, () => patch({ phase: "leave" }));
    at(sorted + 5900, () => setFrame({ k: k + 1, phase: "chaos", pct: null }));

    return () => {
      for (const timer of timers) clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [playing, frame.k]);

  return {
    rootRef,
    frame,
    paused,
    togglePause: () => setPaused((current) => !current),
  };
}
