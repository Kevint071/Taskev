"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

function clock(date: string, timeZone: string | undefined): string {
  return new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(date));
}

/**
 * Clock time of an event ("14:32") in the viewer's time zone. The server
 * formats it in the zone from the time zone cookie (UTC when there is none) so
 * hydration matches; the browser then re-formats it in its own zone.
 */
export function LocalTime({
  date,
  timeZone,
  className,
}: {
  date: string;
  timeZone?: string;
  className?: string;
}) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  let text: string;
  try {
    text = clock(date, hydrated ? undefined : (timeZone ?? "UTC"));
  } catch {
    // An unknown zone name in the cookie: fall back to UTC rather than crash.
    text = clock(date, "UTC");
  }

  return (
    <time dateTime={date} className={className}>
      {text}
    </time>
  );
}
