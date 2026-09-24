export type MenuPlacement = "top" | "bottom";

/**
 * Where a dropdown opens relative to its trigger: below by default, above only
 * when it would not fit below and the space above is larger.
 */
export function menuPlacement({
  spaceAbove,
  spaceBelow,
  menuHeight,
}: {
  spaceAbove: number;
  spaceBelow: number;
  menuHeight: number;
}): MenuPlacement {
  if (menuHeight <= spaceBelow) return "bottom";
  return spaceAbove > spaceBelow ? "top" : "bottom";
}
