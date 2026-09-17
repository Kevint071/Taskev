import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTodaySections, type TodayTask } from "./today";

// Local noon on 2026-09-16, so the calendar day is unambiguous in any zone.
const now = new Date(2026, 8, 16, 12, 0, 0);

function task(
  id: string,
  opts: { due?: string; relevance?: number; status?: string } = {},
): TodayTask {
  return {
    id,
    status: opts.status ?? "disponible",
    dueDate: opts.due ? new Date(`${opts.due}T00:00:00Z`) : null,
    relevance: opts.relevance ?? 0,
  };
}

test("empty list has no next task and empty sections", () => {
  const result = buildTodaySections([], now);
  assert.equal(result.next, null);
  assert.deepEqual(result.overdue, []);
  assert.deepEqual(result.thisWeek, []);
});

test("next is the open task with the highest relevance", () => {
  const result = buildTodaySections(
    [
      task("a", { relevance: 10 }),
      task("b", { relevance: 90 }),
      task("c", { relevance: 40 }),
    ],
    now,
  );
  assert.equal(result.next?.id, "b");
});

test("overdue holds tasks due before today, this week holds the next 7 days", () => {
  const result = buildTodaySections(
    [
      task("next", { relevance: 100 }),
      task("yesterday", { due: "2026-09-15", relevance: 5 }),
      task("today", { due: "2026-09-16", relevance: 5 }),
      task("in7", { due: "2026-09-23", relevance: 5 }),
      task("in8", { due: "2026-09-24", relevance: 5 }),
      task("nodue", { relevance: 5 }),
    ],
    now,
  );
  assert.deepEqual(
    result.overdue.map((t) => t.id),
    ["yesterday"],
  );
  assert.deepEqual(
    result.thisWeek.map((t) => t.id),
    ["today", "in7"],
  );
});

test("the next task is not repeated in the other sections", () => {
  const result = buildTodaySections(
    [
      task("urgent", { due: "2026-09-10", relevance: 100 }),
      task("other", { due: "2026-09-12", relevance: 50 }),
    ],
    now,
  );
  assert.equal(result.next?.id, "urgent");
  assert.deepEqual(
    result.overdue.map((t) => t.id),
    ["other"],
  );
});

test("completed tasks are ignored everywhere", () => {
  const result = buildTodaySections(
    [
      task("done", { due: "2026-09-10", relevance: 999, status: "completada" }),
      task("done2", { due: "2026-09-17", status: "completada" }),
    ],
    now,
  );
  assert.equal(result.next, null);
  assert.deepEqual(result.overdue, []);
  assert.deepEqual(result.thisWeek, []);
});

test("sections are sorted by due date", () => {
  const result = buildTodaySections(
    [
      task("next", { relevance: 100 }),
      task("late", { due: "2026-09-20" }),
      task("early", { due: "2026-09-17" }),
    ],
    now,
  );
  assert.deepEqual(
    result.thisWeek.map((t) => t.id),
    ["early", "late"],
  );
});
