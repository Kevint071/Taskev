"use client";

import { useId } from "react";

// Renders a <script> on the server only; on the client it becomes inert text
// so React does not warn about script tags (see Next's "Preventing Flash" guide).
function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      // biome-ignore lint/security/noDangerouslySetInnerHtml: fixed formatter with JSON-encoded inputs
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Formats a date in the viewer's time zone without a hydration mismatch: the
 * inline script corrects the server output before first paint, and client
 * navigations format directly in the browser.
 */
export function LocalDate({
  date,
  options,
  className,
}: {
  date: string;
  options: Intl.DateTimeFormatOptions;
  className?: string;
}) {
  const id = useId();
  const format = (d: Date) => d.toLocaleDateString("es", options);

  return (
    <>
      <time
        id={id}
        dateTime={date}
        className={className}
        suppressHydrationWarning
      >
        {format(new Date(date))}
      </time>
      <InlineScript
        html={`{var n=document.getElementById(${JSON.stringify(id)});if(n)n.textContent=new Date(${JSON.stringify(date)}).toLocaleDateString("es",${JSON.stringify(options)})}`}
      />
    </>
  );
}
