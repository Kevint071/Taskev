import assert from "node:assert/strict";
import { test } from "node:test";
import { menuPlacement } from "./menu-placement";

test("opens below when the menu fits under the trigger", () => {
  assert.equal(
    menuPlacement({ spaceAbove: 500, spaceBelow: 220, menuHeight: 200 }),
    "bottom",
  );
});

test("flips above when it does not fit below and there is more room above", () => {
  assert.equal(
    menuPlacement({ spaceAbove: 500, spaceBelow: 80, menuHeight: 200 }),
    "top",
  );
});

test("stays below when neither side fits and below has more room", () => {
  assert.equal(
    menuPlacement({ spaceAbove: 60, spaceBelow: 120, menuHeight: 200 }),
    "bottom",
  );
});

test("an exact fit below still opens below", () => {
  assert.equal(
    menuPlacement({ spaceAbove: 500, spaceBelow: 200, menuHeight: 200 }),
    "bottom",
  );
});
