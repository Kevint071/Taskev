"use client";

import {
  Children,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { BackIcon, ChevronRightIcon } from "@/components/ui/icons";

/** How long each card stays before the reel moves on by itself. */
const AUTOPLAY_MS = 6000;

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

const ARROW =
  "flex size-9 shrink-0 items-center justify-center rounded-full border border-line-strong bg-raised text-ink shadow-panel transition-[opacity,scale,background-color,border-color,color] duration-300 hover:border-accent hover:text-accent active:scale-90";

/**
 * Wraps the priority cards (server-rendered, passed as children). From `lg` up
 * they are stacked rows and this adds nothing. Below it they form a horizontal
 * reel showing exactly one card at a time, snapped by native scrolling, that:
 *
 * - advances by itself: the active dot fills over `AUTOPLAY_MS` and moving on
 *   is triggered by the end of that fill, so the bar and the change stay in
 *   step and pausing the bar pauses the reel. After the last card it loops;
 * - pauses while the mouse is over it, a keyboard focus is inside, a finger is
 *   down, or it is off screen / in a hidden tab;
 * - has arrows that only show where there is somewhere to go: none backwards
 *   on the first card, none forwards on the last.
 */
export function PrioritySlider({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const rootRef = useRef<HTMLDivElement>(null);
  const reelRef = useRef<HTMLOListElement>(null);
  const frame = useRef(0);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.5 },
    );
    observer.observe(root);
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    // Plain listeners: these only decide when to pause, the wrapper isn't a control.
    const enter = (e: PointerEvent) =>
      e.pointerType === "mouse" && setHovered(true);
    const leave = () => setHovered(false);
    const down = () => setTouching(true);
    const up = () => setTouching(false);
    const focusIn = (e: FocusEvent) =>
      setFocused((e.target as HTMLElement).matches(":focus-visible"));
    const focusOut = () => setFocused(false);
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
    root.addEventListener("touchstart", down, { passive: true });
    root.addEventListener("touchend", up);
    root.addEventListener("touchcancel", up);
    root.addEventListener("focusin", focusIn);
    root.addEventListener("focusout", focusOut);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointerleave", leave);
      root.removeEventListener("touchstart", down);
      root.removeEventListener("touchend", up);
      root.removeEventListener("touchcancel", up);
      root.removeEventListener("focusin", focusIn);
      root.removeEventListener("focusout", focusOut);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  const paused = hovered || focused || touching || !inView || !tabVisible;

  function syncActive() {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const reel = reelRef.current;
      if (!reel) return;
      const items = Array.from(reel.children) as HTMLElement[];
      let nearest = 0;
      let best = Number.POSITIVE_INFINITY;
      items.forEach((item, i) => {
        const distance = Math.abs(item.offsetLeft - reel.scrollLeft);
        if (distance < best) {
          best = distance;
          nearest = i;
        }
      });
      setActive(nearest);
    });
  }

  function goTo(index: number) {
    const reel = reelRef.current;
    const item = reel?.children[index] as HTMLElement | undefined;
    if (!reel || !item) return;
    reel.scrollTo({ left: item.offsetLeft, behavior: "smooth" });
  }

  const hasPrev = active > 0;
  const hasNext = active < count - 1;

  return (
    <div ref={rootRef} className="flex min-w-0 flex-col gap-3">
      <ol
        ref={reelRef}
        aria-label={label}
        onScroll={syncActive}
        className={`scrollbar-none relative -my-2 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto overflow-y-hidden py-2 lg:m-0 lg:grid lg:snap-none lg:grid-cols-1 lg:gap-0 lg:divide-y lg:divide-line lg:overflow-hidden lg:rounded-2xl lg:border lg:border-line lg:bg-raised lg:p-0 lg:shadow-panel [&::-webkit-scrollbar]:hidden`}
      >
        {slides.map((slide, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: the reel's order is the priority order and never reshuffles in place
            key={i}
            aria-current={i === active ? "true" : undefined}
            className={`group/slide flex w-full min-w-0 shrink-0 snap-start snap-always transition-[scale,opacity] duration-500 ${EASE} lg:block lg:w-auto lg:shrink ${
              i === active ? "" : "max-lg:scale-[0.92] max-lg:opacity-40"
            }`}
          >
            {slide}
          </li>
        ))}
      </ol>

      {count > 1 && (
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <button
            type="button"
            aria-label="Prioridad anterior"
            aria-hidden={!hasPrev}
            tabIndex={hasPrev ? 0 : -1}
            onClick={() => goTo(active - 1)}
            className={`${ARROW} ${hasPrev ? "" : "pointer-events-none scale-75 opacity-0"}`}
          >
            <BackIcon className="size-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center">
              {slides.map((_, i) => (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: one dot per card, same order
                  key={i}
                  type="button"
                  aria-label={`Ver prioridad ${i + 1}`}
                  aria-current={i === active ? "true" : undefined}
                  onClick={() => goTo(i)}
                  className="flex h-6 items-center px-1"
                >
                  <span
                    className={`relative block h-1.5 overflow-hidden rounded-full bg-line-strong transition-[width] duration-500 ${EASE} ${
                      i === active ? "w-8" : "w-1.5"
                    }`}
                  >
                    {i === active && (
                      <span
                        // Remounted per card so the fill restarts from empty.
                        key={active}
                        className="animate-dot-fill absolute inset-0 rounded-full bg-accent"
                        style={
                          {
                            "--autoplay-ms": `${AUTOPLAY_MS}ms`,
                            animationPlayState: paused ? "paused" : "running",
                          } as CSSProperties
                        }
                        onAnimationEnd={() => goTo(hasNext ? active + 1 : 0)}
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
            <p className="tabular text-meta text-muted">
              {active + 1} de {count}
            </p>
          </div>

          <button
            type="button"
            aria-label="Prioridad siguiente"
            aria-hidden={!hasNext}
            tabIndex={hasNext ? 0 : -1}
            onClick={() => goTo(active + 1)}
            className={`${ARROW} ${hasNext ? "" : "pointer-events-none scale-75 opacity-0"}`}
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
