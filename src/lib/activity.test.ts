import assert from "node:assert/strict";
import { test } from "node:test";
import { nestRecentCommentsByGroup } from "./activity";
import type { RecentComment } from "./data/activity";

function comment(
  id: string,
  taskId: string,
  createdAt: string,
  overrides: Partial<RecentComment> = {},
): RecentComment {
  return {
    id,
    taskId,
    taskTitle: overrides.taskTitle ?? `Task ${taskId}`,
    groupId: overrides.groupId ?? "group-1",
    groupName: overrides.groupName ?? "Group",
    body: overrides.body ?? `Comment ${id}`,
    createdAt: new Date(createdAt),
  };
}

test("comments on the same task are merged into one task group", () => {
  const groups = nestRecentCommentsByGroup([
    comment("c3", "t1", "2026-09-16T10:00:00Z"),
    comment("c2", "t2", "2026-09-16T09:00:00Z"),
    comment("c1", "t1", "2026-09-16T08:00:00Z"),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].tasks.length, 2);
  assert.deepEqual(
    groups[0].tasks.find((t) => t.taskId === "t1")?.comments.map((c) => c.id),
    ["c3", "c1"],
  );
});

test("tasks from different groups land in separate entries", () => {
  const groups = nestRecentCommentsByGroup([
    comment("c1", "t1", "2026-09-16T08:00:00Z", {
      groupId: "p1",
      groupName: "Group 1",
    }),
    comment("c2", "t2", "2026-09-16T09:00:00Z", {
      groupId: "p2",
      groupName: "Group 2",
    }),
  ]);

  assert.deepEqual(
    groups.map((p) => p.groupId),
    ["p2", "p1"],
  );
});

test("groups and tasks are ordered by their most recent comment, regardless of input order", () => {
  const groups = nestRecentCommentsByGroup([
    comment("c1", "t-older", "2026-09-15T08:00:00Z", {
      groupId: "p-older",
      groupName: "Older group",
    }),
    comment("c2", "t-newer", "2026-09-16T08:00:00Z", {
      groupId: "p-newer",
      groupName: "Newer group",
    }),
  ]);

  assert.deepEqual(
    groups.map((p) => p.groupId),
    ["p-newer", "p-older"],
  );
});

test("empty input produces no groups", () => {
  assert.deepEqual(nestRecentCommentsByGroup([]), []);
});
