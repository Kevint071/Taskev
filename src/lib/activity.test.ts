import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ActivityKind,
  activityKind,
  groupEventsByTask,
  groupTasksByGroup,
  hourlyActivity,
  summarizeActivity,
} from "./activity";
import type { ActivityEvent } from "./data/activity";

function event(
  id: string,
  taskId: string,
  createdAt: string,
  overrides: Partial<ActivityEvent> = {},
): ActivityEvent {
  return {
    id,
    taskId,
    taskTitle: overrides.taskTitle ?? `Task ${taskId}`,
    groupId: overrides.groupId ?? "group-1",
    groupName: overrides.groupName ?? "Group",
    type: overrides.type ?? "comment_added",
    fromStatus: overrides.fromStatus ?? null,
    toStatus: overrides.toStatus ?? null,
    body: overrides.body ?? null,
    createdAt: new Date(createdAt),
  };
}

test("events on the same task are merged, newest first", () => {
  const tasks = groupEventsByTask([
    event("e3", "t1", "2026-09-16T10:00:00Z"),
    event("e2", "t2", "2026-09-16T09:00:00Z"),
    event("e1", "t1", "2026-09-16T08:00:00Z"),
  ]);

  assert.equal(tasks.length, 2);
  assert.deepEqual(
    tasks.find((t) => t.taskId === "t1")?.events.map((e) => e.id),
    ["e3", "e1"],
  );
});

test("tasks are ordered by their most recent event, regardless of input order", () => {
  const tasks = groupEventsByTask([
    event("e1", "t-older", "2026-09-15T08:00:00Z"),
    event("e2", "t-newer", "2026-09-16T08:00:00Z"),
  ]);

  assert.deepEqual(
    tasks.map((t) => t.taskId),
    ["t-newer", "t-older"],
  );
});

test("a task keeps its group so the feed can link and label it", () => {
  const [task] = groupEventsByTask([
    event("e1", "t1", "2026-09-16T08:00:00Z", {
      groupId: "g9",
      groupName: "Trabajo",
      taskTitle: "Enviar informe",
    }),
  ]);

  assert.equal(task.groupId, "g9");
  assert.equal(task.groupName, "Trabajo");
  assert.equal(task.taskTitle, "Enviar informe");
});

test("empty input produces no tasks", () => {
  assert.deepEqual(groupEventsByTask([]), []);
});

test("tasks are grouped under their group, newest group first", () => {
  const groups = groupTasksByGroup(
    groupEventsByTask([
      event("e1", "t1", "2026-09-16T08:00:00Z", {
        groupId: "g-old",
        groupName: "Casa",
      }),
      event("e2", "t2", "2026-09-16T10:00:00Z", {
        groupId: "g-new",
        groupName: "Trabajo",
      }),
      event("e3", "t3", "2026-09-16T09:00:00Z", {
        groupId: "g-new",
        groupName: "Trabajo",
      }),
    ]),
  );

  assert.deepEqual(
    groups.map((g) => g.groupId),
    ["g-new", "g-old"],
  );
  assert.equal(groups[0].groupName, "Trabajo");
  assert.deepEqual(
    groups[0].tasks.map((t) => t.taskId),
    ["t2", "t3"],
  );
});

test("a group ranks by its most recent task, not by task count", () => {
  const groups = groupTasksByGroup(
    groupEventsByTask([
      event("e1", "t1", "2026-09-16T06:00:00Z", { groupId: "busy" }),
      event("e2", "t2", "2026-09-16T07:00:00Z", { groupId: "busy" }),
      event("e3", "t3", "2026-09-16T09:00:00Z", { groupId: "recent" }),
    ]),
  );

  assert.deepEqual(
    groups.map((g) => g.groupId),
    ["recent", "busy"],
  );
});

test("no tasks produces no groups", () => {
  assert.deepEqual(groupTasksByGroup([]), []);
});

test("summarizeActivity counts what happened, telling completions from other status changes", () => {
  const summary = summarizeActivity([
    event("e1", "t1", "2026-09-16T10:00:00Z", { type: "task_created" }),
    event("e2", "t1", "2026-09-16T11:00:00Z", {
      type: "status_changed",
      fromStatus: "disponible",
      toStatus: "en_curso",
    }),
    event("e3", "t2", "2026-09-16T12:00:00Z", {
      type: "status_changed",
      fromStatus: "en_curso",
      toStatus: "completada",
    }),
    event("e4", "t2", "2026-09-16T13:00:00Z", { type: "comment_added" }),
    event("e5", "t3", "2026-09-16T14:00:00Z", { type: "comment_added" }),
  ]);

  assert.deepEqual(summary, {
    changes: 5,
    tasks: 3,
    created: 1,
    completed: 1,
    statusChanges: 1,
    notes: 2,
  });
});

test("summarizeActivity of nothing is all zeros", () => {
  assert.deepEqual(summarizeActivity([]), {
    changes: 0,
    tasks: 0,
    created: 0,
    completed: 0,
    statusChanges: 0,
    notes: 0,
  });
});

test("activityKind tells apart creations, completions, other status changes and notes", () => {
  const kind = (overrides: Partial<ActivityEvent>) =>
    activityKind(event("e", "t", "2026-09-16T10:00:00Z", overrides));

  assert.equal(kind({ type: "task_created" }), "created");
  assert.equal(kind({ type: "comment_added" }), "notes");
  assert.equal(
    kind({ type: "status_changed", toStatus: "completada" }),
    "completed",
  );
  assert.equal(
    kind({ type: "status_changed", toStatus: "en_curso" }),
    "statusChanges",
  );
});

const at = (iso: string, kind: ActivityKind) => ({
  at: new Date(iso),
  kind,
});

test("hourlyActivity spans from the first active hour to the current one", () => {
  const hours = hourlyActivity(
    [
      at("2026-09-16T07:10:00Z", "created"),
      at("2026-09-16T07:50:00Z", "notes"),
      at("2026-09-16T12:05:00Z", "completed"),
    ],
    new Date("2026-09-16T13:30:00Z"),
    "UTC",
  );

  assert.deepEqual(
    hours.map((h) => h.hour),
    [7, 8, 9, 10, 11, 12, 13],
  );
  assert.deepEqual(
    hours.map((h) => h.total),
    [2, 0, 0, 0, 0, 1, 0],
  );
  assert.equal(hours[0].counts.created, 1);
  assert.equal(hours[0].counts.notes, 1);
  assert.equal(hours[5].counts.completed, 1);
});

test("hourlyActivity shows at least six hours ending at the current one", () => {
  const hours = hourlyActivity(
    [at("2026-09-16T13:00:00Z", "notes")],
    new Date("2026-09-16T13:30:00Z"),
    "UTC",
  );

  assert.deepEqual(
    hours.map((h) => h.hour),
    [8, 9, 10, 11, 12, 13],
  );
});

test("hourlyActivity never goes before midnight", () => {
  const hours = hourlyActivity([], new Date("2026-09-16T02:00:00Z"), "UTC");

  assert.deepEqual(
    hours.map((h) => h.hour),
    [0, 1, 2],
  );
});

test("hourlyActivity buckets by the viewer's hour, not UTC's", () => {
  // 03:30 UTC is 21:30 the previous evening in Mexico City (UTC-6).
  const hours = hourlyActivity(
    [at("2026-09-17T03:30:00Z", "created")],
    new Date("2026-09-17T04:00:00Z"),
    "America/Mexico_City",
  );

  assert.deepEqual(
    hours.map((h) => h.hour),
    [17, 18, 19, 20, 21, 22],
  );
  assert.equal(hours.find((h) => h.hour === 21)?.total, 1);
});
