"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { revealedChars, typedPrefix } from "@/lib/typewriter";
import { ChatMarkdown } from "./chat-markdown";

/**
 * A finished reply, revealed progressively when `animate` is on. Clicking it
 * skips to the full text. Screen readers get the whole reply at once, not
 * every partial step.
 */
export function TypedMarkdown({
  text,
  animate,
  onProgress,
}: {
  text: string;
  animate: boolean;
  /** Called on every frame that reveals more text, e.g. to keep it in view. */
  onProgress?: () => void;
}) {
  const [count, setCount] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const progress = useRef(onProgress);
  useEffect(() => {
    progress.current = onProgress;
  });

  // After the new text is in the DOM, so the caller measures the grown bubble
  // (including the last step, when the typed text becomes the full reply).
  useLayoutEffect(() => {
    if (animate && count > 0) progress.current?.();
  }, [animate, count]);

  useEffect(() => {
    if (!animate || text.length === 0) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const next = revealedChars(now - start, text.length);
      setCount(next);
      if (next < text.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, text]);

  if (!animate || skipped || count >= text.length) {
    return <ChatMarkdown text={text} />;
  }
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: a pointer shortcut; the full reply is already available to assistive tech
    // biome-ignore lint/a11y/noStaticElementInteractions: same shortcut, the text stays readable without it
    <div className="space-y-2" onClick={() => setSkipped(true)}>
      <div className="sr-only">
        <ChatMarkdown text={text} />
      </div>
      {/* Typing text isn't the motion that setting is about: like toasts, it keeps its motion (data-motion-ok). */}
      <div aria-hidden="true" data-motion-ok className="typing-caret space-y-2">
        <ChatMarkdown text={typedPrefix(text, count)} />
      </div>
    </div>
  );
}
