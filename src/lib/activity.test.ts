import assert from "node:assert/strict";
import { test } from "node:test";
import { groupEventsByTask } from "./activity";
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
