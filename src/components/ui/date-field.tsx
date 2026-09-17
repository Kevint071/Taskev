"use client";

import { useState } from "react";
import { addDaysUtc, todayUtcMidnight } from "@/lib/calendar";
import { CalendarPanel, type CalendarShortcut } from "./calendar-panel";
import { CalendarIcon } from "./icons";
import { controlClass } from "./input";
import { Popover } from "./popover";

const displayFormat = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDisplay(date: Date): string {
  return displayFormat.format(date).replace(".", "");
}

/** Custom calendar popover trigger; replaces the native `<input type="date">`. */
export function DateField({
  value,
  onChange,
  allowClear = true,
  placeholder = "Sin fecha",
  className = "",
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  allowClear?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value) : null;
  const today = todayUtcMidnight();

  const shortcuts: CalendarShortcut[] = [
    { key: "today", label: "Hoy", date: today },
    { key: "tomorrow", label: "Mañana", date: addDaysUtc(today, 1) },
    { key: "next-week", label: "Próxima semana", date: addDaysUtc(today, 7) },
    ...(allowClear ? [{ key: "clear", label: "Sin fecha", date: null }] : []),
  ];

  return (
    <Popover open={open} onClose={() => setOpen(false)} className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${controlClass} tabular flex h-9 w-full items-center gap-2 px-3 text-left ${
          selected ? "" : "text-muted/80"
        }`}
      >
        <CalendarIcon />
        {selected ? formatDisplay(selected) : placeholder}
      </button>
      {open && (
        <div className="absolute z-20 mt-1">
          <CalendarPanel
            selected={selected}
            shortcuts={shortcuts}
            onSelect={(date) => {
              onChange(date.toISOString());
              setOpen(false);
            }}
            onClear={() => {
              onChange(null);
              setOpen(false);
            }}
          />
        </div>
      )}
    </Popover>
  );
}
