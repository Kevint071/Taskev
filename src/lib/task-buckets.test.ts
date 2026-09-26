import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type BucketableTask,
  buildTaskBuckets,
  countByStatus,
  filterTasks,
} from "./task-buckets";

// Local noon on 2026-09-16, so the calendar day is unambiguous in any zone.
const now = new Date(2026, 8, 16, 12, 0, 0);

function task(
  id: string,
  opts: Partial<BucketableTask> & { due?: string } = {},
): BucketableTask {
  const { due, ...rest } = opts;
  return {
    id,
    title: id,
    groupId: "p1",
    groupName: "Grupo",
    status: "disponible",
    dueDate: due ? `${due}T00:00:00.000Z` : null,
    completedAt: null,
    relevance: 0,
    progressPct: 0,
    ...rest,
  };
}

function keys(tasks: BucketableTask[]) {
  return buildTaskBuckets(tasks, now).map((g) => g.key);
}

test("empty list yields no buckets", () => {
  assert.deepEqual(buildTaskBuckets([], now), []);
});

test("open tasks fall into overdue / today / upcoming", () => {
  const buckets = buildTaskBuckets(
    [
      task("late", { due: "2026-09-10" }),
      task("today", { due: "2026-09-16" }),
      task("soon", { due: "2026-09-20" }),
      task("far", { due: "2026-09-24" }),
      task("none"),
    ],
    now,
  );
  const byKey = Object.fromEntries(
    buckets.map((g) => [g.key, g.tasks.map((t) => t.id)]),
  );
  assert.deepEqual(byKey, {
    vencidas: ["late"],
    hoy: ["today"],
    proximas: ["soon", "far", "none"],
  });
});

test("buckets come out in urgency order and empty ones are omitted", () => {
  assert.deepEqual(
    keys([
      task("none"),
      task("far", { due: "2026-12-01" }),
      task("late", { due: "2026-09-01" }),
      task("done", { status: "completada" }),
    ]),
    ["vencidas", "proximas", "completadas"],
  );
});

test("dated buckets sort by due date, ties broken by relevance", () => {
  const buckets = buildTaskBuckets(
    [
      task("b", { due: "2026-09-19", relevance: 10 }),
      task("a", { due: "2026-09-18", relevance: 1 }),
      task("c", { due: "2026-09-19", relevance: 50 }),
    ],
    now,
  );
  assert.deepEqual(
    buckets[0].tasks.map((t) => t.id),
    ["a", "c", "b"],
  );
});

test("undated tasks sort by relevance, highest first", () => {
  const buckets = buildTaskBuckets(
    [
      task("low", { relevance: 5 }),
      task("high", { relevance: 80 }),
      task("mid", { relevance: 30 }),
    ],
    now,
  );
  assert.deepEqual(
    buckets[0].tasks.map((t) => t.id),
    ["high", "mid", "low"],
  );
});

test("equal relevance is broken by progress, and dated tasks sort before undated ones", () => {
  const buckets = buildTaskBuckets(
    [
      task("free-fresh", { relevance: 30, progressPct: 0 }),
      task("free-far", { relevance: 30, progressPct: 60 }),
      task("dated-fresh", { due: "2026-09-18", relevance: 50, progressPct: 5 }),
      task("dated-far", { due: "2026-09-18", relevance: 50, progressPct: 80 }),
    ],
    now,
  );
  assert.deepEqual(
    buckets[0].tasks.map((t) => t.id),
    ["dated-far", "dated-fresh", "free-far", "free-fresh"],
  );
});

test("completed tasks ignore their due date and sort by completion, newest first", () => {
  const buckets = buildTaskBuckets(
    [
      task("old", {
        status: "completada",
        due: "2026-09-01",
        completedAt: "2026-09-02T00:00:00.000Z",
      }),
      task("new", {
        status: "completada",
        completedAt: "2026-09-15T00:00:00.000Z",
      }),
    ],
    now,
  );
  assert.equal(buckets.length, 1);
  assert.equal(buckets[0].key, "completadas");
  assert.deepEqual(
    buckets[0].tasks.map((t) => t.id),
    ["new", "old"],
  );
});

test("filterTasks: empty filters keep everything", () => {
  const all = [task("a"), task("b")];
  assert.deepEqual(
    filterTasks(all, { query: "", status: "todas", groupId: "todos" }),
    all,
  );
});

test("filterTasks: search ignores case and accents, matches title or group", () => {
  const all = [
    task("Revisión del contrato", { groupName: "Legal" }),
    task("Llamar", { groupName: "Compras" }),
  ];
  const f = { status: "todas", groupId: "todos" } as const;
  assert.deepEqual(
    filterTasks(all, { ...f, query: "revision" }).map((t) => t.id),
    ["Revisión del contrato"],
  );
  assert.deepEqual(
    filterTasks(all, { ...f, query: "COMPRAS" }).map((t) => t.id),
    ["Llamar"],
  );
});

test("filterTasks: status and group narrow the list", () => {
  const all = [
    task("a", { status: "en_curso", groupId: "p1" }),
    task("b", { status: "bloqueada", groupId: "p2" }),
    task("c", { status: "completada", groupId: "p1" }),
  ];
  assert.deepEqual(
    filterTasks(all, { query: "", status: "en_curso", groupId: "todos" }).map(
      (t) => t.id,
    ),
    ["a"],
  );
  assert.deepEqual(
    filterTasks(all, { query: "", status: "todas", groupId: "p1" }).map(
      (t) => t.id,
    ),
    ["a", "c"],
  );
});

test("countByStatus counts open tasks only", () => {
  const counts = countByStatus([
    task("a", { status: "en_curso" }),
    task("b", { status: "en_curso" }),
    task("c", { status: "bloqueada" }),
    task("d", { status: "completada" }),
  ]);
  assert.deepEqual(counts, {
    disponible: 0,
    en_curso: 2,
    bloqueada: 1,
    pausada: 0,
  });
});
