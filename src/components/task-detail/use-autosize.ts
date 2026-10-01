import { type RefObject, useEffect } from "react";

export function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  // Measure without a scrollbar: at the collapsed "auto" height one appears,
  // narrows the text, and the extra wrapping leaves a phantom blank line.
  el.style.overflowY = "hidden";
  el.style.height = "auto";
  const borderHeight = el.offsetHeight - el.clientHeight;
  el.style.height = `${el.scrollHeight + borderHeight}px`;
  el.style.overflowY = "";
}

export function centerTextareaEnd(el: HTMLTextAreaElement | null) {
  if (!el || el.selectionStart !== el.value.length) return;
  const maxScrollTop = el.scrollHeight - el.clientHeight;
  el.scrollTop = maxScrollTop - Math.min(el.clientHeight / 2, maxScrollTop);
}

/**
 * Fits the textarea to its text on mount and whenever its width changes
 * (fonts loading, rotation, resizing), otherwise a stale height clips the
 * last lines. Typing is fitted by the caller.
 */
export function useAutosize(ref: RefObject<HTMLTextAreaElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    autosize(el);
    const observer = new ResizeObserver(() => autosize(el));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}
