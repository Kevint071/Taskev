import { useRef } from "react";
import {
  SETTINGS_PATH,
  type SettingsTab,
  settingsHref,
} from "@/lib/settings-tabs";

/**
 * History handling for the settings screens. `section` is the open section
 * from the URL, or null on the phone index.
 */
export function useSettingsNavigation(section: SettingsTab | null) {
  // The section last pushed from the phone index: going back to the index
  // from it pops that entry instead of stacking a new one.
  const pushedFromIndex = useRef<SettingsTab | null>(null);

  function openSection(tab: SettingsTab) {
    pushedFromIndex.current = tab;
    window.history.pushState(null, "", settingsHref(tab));
    window.scrollTo(0, 0);
  }

  function backToIndex() {
    if (pushedFromIndex.current === section) {
      pushedFromIndex.current = null;
      window.history.back();
      return;
    }
    // Opened straight from a link (the avatar menu): swap the entry so the
    // system back button still leaves settings.
    window.history.replaceState(null, "", SETTINGS_PATH);
    window.scrollTo(0, 0);
  }

  function selectTab(tab: SettingsTab) {
    // Replace rather than push: switching tabs shouldn't fill the back stack.
    window.history.replaceState(null, "", settingsHref(tab));
  }

  return { openSection, backToIndex, selectTab };
}
