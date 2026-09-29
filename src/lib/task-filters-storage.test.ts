import assert from "node:assert/strict";
import { test } from "node:test";
import { NO_FILTERS, parseTaskFilters } from "./task-filters-storage";

test("parseTaskFilters returns no filters when nothing is stored", () => {
  assert.deepEqual(parseTaskFilters(null), NO_FILTERS);
});

test("parseTaskFilters restores valid stored filters", () => {
  const stored = { query: "informe", status: "en_curso", groupId: "g1" };
  assert.deepEqual(parseTaskFilters(JSON.stringify(stored)), stored);
});

test("parseTaskFilters ignores corrupt JSON", () => {
  assert.deepEqual(parseTaskFilters("{no"), NO_FILTERS);
  assert.deepEqual(parseTaskFilters("null"), NO_FILTERS);
});

test("parseTaskFilters drops unknown status and wrong types", () => {
  const raw = JSON.stringify({ query: 3, status: "completada", groupId: null });
  assert.deepEqual(parseTaskFilters(raw), NO_FILTERS);
});
