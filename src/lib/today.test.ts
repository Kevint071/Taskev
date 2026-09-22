import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTodayMetrics, buildTodaySections, type TodayTask } from "./today";

// Local noon on 2026-09-16, so the calendar day is unambiguous in any zone.
const now = new Date(2026, 8, 16, 12, 0, 0);

function task(
  id: string,
  opts: {
    due?: string;
    relevance?: number;
    status?: string;
    progress?: number;
    pinned?: boolean;
  } = {},
): TodayTask {
  return {
    id,
    status: opts.status ?? "disponible",
    dueDate: opts.due ? new Date(`${opts.due}T00:00:00Z`) : null,
    relevance: opts.relevance ?? 0,
    progressPct: opts.progress ?? 0,
    pinnedToday: opts.pinned ?? false,
  };
}

function utcDay(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

test("empty list has no top tasks and empty sections", () => {
  const result = buildTodaySections([], now);
  assert.deepEqual(result.top, []);
  assert.deepEqual(result.overdue, []);
  assert.deepEqual(result.dueToday, []);
  assert.deepEqual(result.thisWeek, []);
});

test("top holds open tasks ordered by relevance, highest first", () => {
  const result = buildTodaySections(
    [
      task("a", { relevance: 10 }),
      task("b", { relevance: 90 }),
      task("c", { relevance: 40 }),
    ],
    now,
  );
  assert.deepEqual(
    result.top.map((t) => t.id),
    ["b", "c", "a"],
  );
});

test("top is capped at 3 tasks by default", () => {
  const result = buildTodaySections(
    [
      task("a", { relevance: 10 }),
      task("b", { relevance: 90 }),
      task("c", { relevance: 40 }),
      task("d", { relevance: 70 }),
    ],
    now,
  );
  assert.deepEqual(
    result.top.map((t) => t.id),
    ["b", "d", "c"],
  );
});

test("top breaks equal relevance by progress, most advanced first", () => {
  const result = buildTodaySections(
    [
      task("fresh", { relevance: 60, progress: 0 }),
      task("half", { relevance: 60, progress: 50 }),
      task("almost", { relevance: 60, progress: 90 }),
    ],
    now,
  );
  assert.deepEqual(
    result.top.map((t) => t.id),
    ["almost", "half", "fresh"],
  );
});

test("progress never outranks a higher relevance", () => {
  const result = buildTodaySections(
    [
      task("advanced", { relevance: 40, progress: 95 }),
      task("urgent", { relevance: 80, progress: 0 }),
    ],
    now,
  );
  assert.deepEqual(
    result.top.map((t) => t.id),
    ["urgent", "advanced"],
  );
});

test("a pinned task outranks a more relevant one for the top spots", () => {
  const result = buildTodaySections(
    [
      task("hot", { relevance: 90 }),
      task("pinned", { relevance: 5, pinned: true }),
    ],
    now,
  );
  assert.deepEqual(
    result.top.map((t) => t.id),
    ["pinned", "hot"],
  );
});

test("pinned tasks are still ranked by relevance among themselves", () => {
  const result = buildTodaySections(
    [
      task("pinned-cold", { relevance: 5, pinned: true }),
      task("pinned-hot", { relevance: 50, pinned: true }),
    ],
    now,
  );
  assert.deepEqual(
    result.top.map((t) => t.id),
    ["pinned-hot", "pinned-cold"],
  );
});

test("pinned tasks fill the limit first, leaving no room for the rest", () => {
  const result = buildTodaySections(
    [
      task("pinned-1", { relevance: 1, pinned: true }),
      task("pinned-2", { relevance: 1, pinned: true }),
      task("pinned-3", { relevance: 1, pinned: true }),
      task("unpinned-hot", { relevance: 99 }),
    ],
    now,
  );
  assert.deepEqual(
    result.top.map((t) => t.id),
    ["pinned-1", "pinned-2", "pinned-3"],
  );
});

test("a pinned but blocked or paused task still never makes the top", () => {
  const result = buildTodaySections(
    [
      task("pinned-blocked", {
        relevance: 100,
        status: "bloqueada",
        pinned: true,
      }),
      task("ready", { relevance: 1 }),
    ],
    now,
  );
  assert.deepEqual(
    result.top.map((t) => t.id),
    ["ready"],
  );
});

test("blocked and paused tasks never make the top", () => {
  const result = buildTodaySections(
    [
      task("blocked", { relevance: 100, status: "bloqueada" }),
      task("paused", { relevance: 90, status: "pausada" }),
      task("ready", { relevance: 10 }),
      task("going", { relevance: 5, status: "en_curso" }),
    ],
    now,
  );
  assert.deepEqual(
    result.top.map((t) => t.id),
    ["ready", "going"],
  );
});

test("top is empty when every open task is blocked or paused", () => {
  const result = buildTodaySections(
    [
      task("blocked", { relevance: 100, status: "bloqueada" }),
      task("paused", { relevance: 90, status: "pausada" }),
    ],
    now,
  );
  assert.deepEqual(result.top, []);
});

test("blocked and paused tasks still show in the due-date sections", () => {
  const result = buildTodaySections(
    [
      task("blocked", { due: "2026-09-15", status: "bloqueada" }),
      task("paused", { due: "2026-09-16", status: "pausada" }),
    ],
    now,
  );
  assert.deepEqual(
    result.overdue.map((t) => t.id),
    ["blocked"],
  );
  assert.deepEqual(
    result.dueToday.map((t) => t.id),
    ["paused"],
  );
});

test("overdue, due-today and this-week each hold their own tasks", () => {
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
    result.dueToday.map((t) => t.id),
    ["today"],
  );
  assert.deepEqual(
    result.thisWeek.map((t) => t.id),
    ["in7"],
  );
});

test("top tasks also appear in overdue/this week when they qualify", () => {
  const result = buildTodaySections(
    [
      task("urgent", { due: "2026-09-10", relevance: 100 }),
      task("other", { due: "2026-09-12", relevance: 50 }),
    ],
    now,
  );
  assert.deepEqual(
    result.top.map((t) => t.id),
    ["urgent", "other"],
  );
  assert.deepEqual(
    result.overdue.map((t) => t.id),
    ["urgent", "other"],
  );
});

test("completed tasks are ignored everywhere", () => {
  const result = buildTodaySections(
    [
      task("done", { due: "2026-09-10", relevance: 999, status: "completada" }),
      task("done2", { due: "2026-09-16", status: "completada" }),
    ],
    now,
  );
  assert.deepEqual(result.top, []);
  assert.deepEqual(result.overdue, []);
  assert.deepEqual(result.dueToday, []);
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

test("buildTodayMetrics: counts completions today and this week", () => {
  const metrics = buildTodayMetrics(
    [utcDay("2026-09-16"), utcDay("2026-09-15"), utcDay("2026-09-01"), null],
    now,
  );

  assert.equal(metrics.completedToday, 1);
  assert.equal(metrics.completedThisWeek, 2);
});

test("buildTodayMetrics: streak counts consecutive days ending today", () => {
  const metrics = buildTodayMetrics(
    [
      utcDay("2026-09-16"),
      utcDay("2026-09-15"),
      utcDay("2026-09-14"),
      utcDay("2026-09-12"),
    ],
    now,
  );

  assert.equal(metrics.streak, 3);
});

test("buildTodayMetrics: streak gives today a grace day when nothing is done yet", () => {
  const metrics = buildTodayMetrics(
    [utcDay("2026-09-15"), utcDay("2026-09-14")],
    now,
  );

  assert.equal(metrics.streak, 2);
});

test("buildTodayMetrics: streak is zero once a day is skipped", () => {
  const metrics = buildTodayMetrics([utcDay("2026-09-13")], now);

  assert.equal(metrics.streak, 0);
});
