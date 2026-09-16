import assert from "node:assert/strict";
import { test } from "node:test";
import {
  positionAtEnd,
  positionBetween,
  renormalizedPositions,
} from "./ordering";

test("positionAtEnd: empty list starts at the gap", () => {
  assert.equal(positionAtEnd(null), 1000);
});

test("positionAtEnd: appends after the last position", () => {
  assert.equal(positionAtEnd(1000), 2000);
});

test("positionBetween: empty list", () => {
  assert.equal(positionBetween(null, null), 1000);
});

test("positionBetween: insert at start", () => {
  const p = positionBetween(null, 1000);
  assert.ok(p < 1000 && p > 0);
});

test("positionBetween: insert at end", () => {
  const p = positionBetween(1000, null);
  assert.ok(p > 1000);
});

test("positionBetween: insert between two neighbours lands strictly between them", () => {
  const p = positionBetween(1000, 2000);
  assert.ok(p > 1000 && p < 2000);
});

test("positionBetween: repeated inserts at the same point keep narrowing without crossing", () => {
  const before = 1000;
  let after = 2000;
  for (let i = 0; i < 20; i++) {
    const p = positionBetween(before, after);
    assert.ok(p > before && p < after);
    after = p;
  }
});

test("renormalizedPositions: evenly spaced and strictly increasing", () => {
  const positions = renormalizedPositions(5);
  assert.deepEqual(positions, [1000, 2000, 3000, 4000, 5000]);
});
