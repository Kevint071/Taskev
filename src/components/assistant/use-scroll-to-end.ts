import { useEffect, useRef } from "react";

/** Keeps the end of the transcript in view as it grows. */
export function useScrollToEnd(
  length: number,
  pending: unknown,
  busy: boolean,
) {
  const endRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the transcript grows
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [length, pending, busy]);

  function keepEndInView() {
    // Instant: a smooth scroll would still be chasing the previous frame.
    endRef.current?.scrollIntoView({ block: "end", behavior: "instant" });
  }

  return { endRef, keepEndInView };
}
