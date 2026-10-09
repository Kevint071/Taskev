import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";

/** How the user tried to leave: through a link, or the system back button. */
type LeaveAttempt = { href: string } | { back: true };

/** The in-app destination of a plain left click on a link, if any. */
function internalHref(e: MouseEvent): string | null {
  if (
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey
  ) {
    return null;
  }
  const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
  if (!(link instanceof HTMLAnchorElement)) return null;
  if (
    (link.target && link.target !== "_self") ||
    link.hasAttribute("download")
  ) {
    return null;
  }
  const url = new URL(link.href);
  if (url.origin !== window.location.origin) return null;
  if (
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  ) {
    return null;
  }
  return url.pathname + url.search + url.hash;
}

/**
 * Keeps an unsaved form from being thrown away by accident: while `dirty`,
 * links, the system back button and reloads ask first. `leave` navigates
 * away on purpose, replacing the form's history entry.
 *
 * The back button can't be cancelled, so a guard entry for the same URL sits
 * on top of the form's: going back pops it, the page stays, and the dialog
 * opens instead.
 */
export function useLeaveGuard(dirty: boolean) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<LeaveAttempt | null>(null);
  // Whether the guard entry is currently on top of the form's entry.
  const guarded = useRef(false);
  // Runs once the guard entry has been popped on purpose.
  const afterPop = useRef<(() => void) | null>(null);
  // Set once leaving is decided, so nothing asks or re-guards after that.
  const leaving = useRef(false);

  function pushGuard() {
    if (guarded.current || leaving.current) return;
    guarded.current = true;
    window.history.pushState(null, "", window.location.href);
  }

  function leave(href: string) {
    leaving.current = true;
    setAttempt(null);
    if (!guarded.current) {
      router.replace(href);
      return;
    }
    guarded.current = false;
    afterPop.current = () => router.replace(href);
    window.history.back();
  }

  const guardDirty = useEffectEvent(() => {
    if (dirty) pushGuard();
  });

  const onPopState = useEffectEvent(() => {
    const next = afterPop.current;
    if (next) {
      afterPop.current = null;
      next();
      return;
    }
    if (!guarded.current) return;
    guarded.current = false;
    if (dirty) setAttempt({ back: true });
    else window.history.back();
  });

  const onClick = useEffectEvent((e: MouseEvent) => {
    if (leaving.current || (!dirty && !guarded.current)) return;
    const href = internalHref(e);
    if (href === null) return;
    e.preventDefault();
    if (dirty) setAttempt({ href });
    // Edited and then emptied again: just leave, dropping the guard entry.
    else leave(href);
  });

  const onBeforeUnload = useEffectEvent((e: BeforeUnloadEvent) => {
    if (dirty && !leaving.current) e.preventDefault();
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: guardDirty reads `dirty` and must run when it changes
  useEffect(() => {
    guardDirty();
  }, [dirty]);

  useEffect(() => {
    const popState = () => onPopState();
    // Capture phase: runs before next/link, which skips prevented clicks.
    const click = (e: MouseEvent) => onClick(e);
    const beforeUnload = (e: BeforeUnloadEvent) => onBeforeUnload(e);
    window.addEventListener("popstate", popState);
    document.addEventListener("click", click, true);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("popstate", popState);
      document.removeEventListener("click", click, true);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, []);

  /** Keeps editing; a back press gets its guard entry back. */
  function stay() {
    if (attempt && "back" in attempt) pushGuard();
    setAttempt(null);
  }

  function discard() {
    if (attempt && "href" in attempt) {
      leave(attempt.href);
      return;
    }
    // The guard entry is already gone: one more step back really leaves.
    leaving.current = true;
    setAttempt(null);
    window.history.back();
  }

  return { asking: attempt !== null, leave, stay, discard };
}
