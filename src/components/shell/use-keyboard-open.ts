import { useEffect, useState } from "react";

function isTextField(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.matches("textarea, input:not([type=checkbox], [type=radio])") ||
      target.isContentEditable)
  );
}

// Smallest shrink of the viewport that counts as a keyboard, so a collapsing
// browser toolbar is not mistaken for one.
const KEYBOARD_MIN_HEIGHT_PX = 150;

// True while a phone's on-screen keyboard is showing. Focus alone is not
// enough: the Android back gesture hides the keyboard but leaves the field
// focused, so the viewport height is what says whether it is really open.
export function useKeyboardOpen(enabled: boolean) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setOpen(false);
      return;
    }
    const viewport = window.visualViewport;
    // Tallest viewport seen at the current width, i.e. with no keyboard.
    let baseline = { width: window.innerWidth, height: 0 };

    function update() {
      const width = window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      baseline =
        width === baseline.width
          ? { width, height: Math.max(baseline.height, height) }
          : { width, height };
      setOpen(
        isTextField(document.activeElement) &&
          baseline.height - height > KEYBOARD_MIN_HEIGHT_PX,
      );
    }

    update();
    const target = viewport ?? window;
    target.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      target.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, [enabled]);

  return open;
}
