"use client";

import {
  type ComponentProps,
  type KeyboardEvent,
  useEffect,
  useRef,
} from "react";

const ITEM_SELECTOR =
  '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]';

/** The button that opened the menu: a sibling of the menu inside its wrapper. */
function triggerOf(menu: HTMLElement | null) {
  return menu?.parentElement?.querySelector<HTMLElement>(
    '[aria-haspopup][aria-expanded="true"]',
  );
}

/**
 * A `role="menu"` panel that is mounted only while open, with the keyboard
 * behaviour the pattern promises: focus lands on the checked item (else the
 * first) when it appears, arrows, Home and End move between items, and Escape
 * or Tab close it handing focus back to the trigger. Its items carry
 * `role="menuitem"` (or `menuitemradio`); the trigger must sit next to it with
 * `aria-haspopup` and `aria-expanded`.
 */
export function Menu({
  onClose,
  ref,
  onKeyDown,
  ...props
}: ComponentProps<"div"> & { onClose: () => void }) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  // The menu is mounted only while open, so mounting is opening.
  useEffect(() => {
    const items = menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR);
    if (!items || items.length === 0) return;
    const checked = Array.from(items).find(
      (item) => item.getAttribute("aria-checked") === "true",
    );
    (checked ?? items[0]).focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const menu = menuRef.current;
    if (event.key === "Escape" || event.key === "Tab") {
      // Tab keeps its default, so focus moves on from the trigger.
      if (event.key === "Escape") event.preventDefault();
      triggerOf(menu)?.focus();
      onClose();
      return;
    }
    const items = Array.from(
      menu?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [],
    );
    if (items.length === 0) return;
    const at = items.indexOf(document.activeElement as HTMLElement);
    let next: number;
    if (event.key === "ArrowDown") next = (at + 1) % items.length;
    else if (event.key === "ArrowUp") {
      next = (at - 1 + items.length) % items.length;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    items[next].focus();
  }

  return (
    <div
      {...props}
      role="menu"
      ref={(node) => {
        menuRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      onKeyDown={handleKeyDown}
    />
  );
}
