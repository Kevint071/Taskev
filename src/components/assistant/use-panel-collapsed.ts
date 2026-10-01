import { useEffect, useState } from "react";

/** Remembers, per browser, whether the desktop conversation panel is folded. */
const PANEL_STORAGE_KEY = "taskev.assistant.panelCollapsed";

export function usePanelCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(PANEL_STORAGE_KEY) === "1");
    } catch {
      // Storage can be blocked (private mode); the panel then starts expanded.
    }
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(PANEL_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Storage can be blocked (private mode); the choice lasts for this visit.
    }
  }

  return { collapsed, toggle };
}
