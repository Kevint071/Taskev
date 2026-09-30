"use client";

import { type KeyboardEvent, type ReactNode, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/icons";
import { Popover } from "@/components/ui/popover";

export type PickerOption = { id: string; label: string };

/**
 * A themed dropdown in place of a native <select>, whose popup can't be styled.
 * By default the trigger keeps one width, set by the longest label, so it
 * doesn't shift when the selection changes.
 */
export function OptionPicker({
  value,
  options,
  onChange,
  label,
  disabled,
  title,
  icon,
  opensUp = false,
  align = "right",
  sizeToValue = false,
  className = "",
  triggerClassName = "",
}: {
  value: string;
  options: PickerOption[];
  onChange: (next: string) => void;
  /** Accessible name of the control, e.g. "Proveedor". */
  label: string;
  disabled?: boolean;
  title?: string;
  icon?: ReactNode;
  /** Opens the menu above the trigger, for controls near the bottom edge. */
  opensUp?: boolean;
  align?: "left" | "right";
  /** Sizes the trigger to the selected label instead of the longest one. */
  sizeToValue?: boolean;
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentLabel = options.find((o) => o.id === value)?.label ?? value;

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function pick(next: string) {
    close();
    if (next !== value) onChange(next);
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      // The menu mounts after this handler; focus the current option once it has.
      requestAnimationFrame(() =>
        menuRef.current
          ?.querySelector<HTMLElement>('[aria-selected="true"]')
          ?.focus(),
      );
    }
  }

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const delta =
      e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : undefined;
    if (delta === undefined) return;
    e.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [],
    );
    const at = items.indexOf(document.activeElement as HTMLElement);
    items[(at + delta + items.length) % items.length]?.focus();
  }

  return (
    <Popover open={open} onClose={close} className={className}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${currentLabel}`}
        disabled={disabled}
        title={title}
        onClick={toggle}
        className={`flex cursor-pointer items-center gap-2 rounded-full border text-meta font-medium text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${triggerClassName}`}
      >
        {icon}
        {/* Every label is stacked in one grid cell, so the button is as wide as
            the longest one whichever is selected. */}
        <span className="grid max-w-[min(60vw,20rem)] grid-cols-[minmax(0,1fr)] text-left">
          {(sizeToValue ? [{ id: value, label: currentLabel }] : options).map(
            (o) => (
              <span
                key={o.id}
                aria-hidden={o.id !== value}
                className={`col-start-1 row-start-1 truncate ${
                  o.id === value ? "" : "invisible"
                }`}
              >
                {o.label}
              </span>
            ),
          )}
        </span>
        <ChevronDownIcon
          className={`size-4 shrink-0 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          className={`animate-menu-in absolute z-50 flex max-h-64 min-w-full max-w-[min(90vw,24rem)] flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-control border border-line-strong bg-raised p-1 shadow-lg ${
            opensUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } ${align === "right" ? "right-0" : "left-0"}`}
          style={{
            backgroundColor: "var(--raised)",
            transformOrigin: `${opensUp ? "bottom" : "top"} ${align}`,
          }}
        >
          {options.map((o) => {
            const current = o.id === value;
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={current}
                onClick={() => pick(o.id)}
                className={`flex min-h-10 w-full items-center gap-2 rounded-control px-2.5 text-left text-meta whitespace-nowrap transition-colors focus-visible:bg-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent lg:min-h-9 ${
                  current
                    ? "bg-sunken font-semibold text-ink"
                    : "text-ink hover:bg-sunken"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                <CheckIcon
                  className={`size-4 shrink-0 text-accent ${current ? "" : "invisible"}`}
                />
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}
