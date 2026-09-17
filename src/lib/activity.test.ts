import assert from "node:assert/strict";
import { test } from "node:test";
import { groupRecentCommentsByProject } from "./activity";
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
    projectId: overrides.projectId ?? "project-1",
    projectName: overrides.projectName ?? "Project",
    body: overrides.body ?? `Comment ${id}`,
    createdAt: new Date(createdAt),
  };
}

test("comments on the same task are merged into one task group", () => {
  const projects = groupRecentCommentsByProject([
    comment("c3", "t1", "2026-09-16T10:00:00Z"),
    comment("c2", "t2", "2026-09-16T09:00:00Z"),
    comment("c1", "t1", "2026-09-16T08:00:00Z"),
  ]);

  assert.equal(projects.length, 1);
  assert.equal(projects[0].tasks.length, 2);
  assert.deepEqual(
    projects[0].tasks.find((t) => t.taskId === "t1")?.comments.map((c) => c.id),
    ["c3", "c1"],
  );
});

test("tasks from different projects land in separate project groups", () => {
  const projects = groupRecentCommentsByProject([
    comment("c1", "t1", "2026-09-16T08:00:00Z", {
      projectId: "p1",
      projectName: "Project 1",
    }),
    comment("c2", "t2", "2026-09-16T09:00:00Z", {
      projectId: "p2",
      projectName: "Project 2",
    }),
  ]);

  assert.deepEqual(
    projects.map((p) => p.projectId),
    ["p2", "p1"],
  );
});

test("projects and tasks are ordered by their most recent comment, regardless of input order", () => {
  const projects = groupRecentCommentsByProject([
    comment("c1", "t-older", "2026-09-15T08:00:00Z", {
      projectId: "p-older",
      projectName: "Older project",
    }),
    comment("c2", "t-newer", "2026-09-16T08:00:00Z", {
      projectId: "p-newer",
      projectName: "Newer project",
    }),
  ]);

  assert.deepEqual(
    projects.map((p) => p.projectId),
    ["p-newer", "p-older"],
  );
});

test("empty input produces no groups", () => {
  assert.deepEqual(groupRecentCommentsByProject([]), []);
});
