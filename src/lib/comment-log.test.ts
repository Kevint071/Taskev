import assert from "node:assert/strict";
import { test } from "node:test";
import type { TaskComment } from "@/components/group-types";
import { dayLabel, groupCommentsByDay } from "./comment-log";

function comment(id: string, createdAt: Date): TaskComment {
  return { id, taskId: "t", body: id, createdAt: createdAt.toISOString() };
}

test("dayLabel names today and yesterday", () => {
  const now = new Date(2026, 5, 15, 10, 0);
  assert.equal(dayLabel(new Date(2026, 5, 15, 8, 0), now), "Hoy");
  assert.equal(dayLabel(new Date(2026, 5, 14, 23, 0), now), "Ayer");
  assert.notEqual(dayLabel(new Date(2026, 5, 10, 9, 0), now), "Ayer");
});

test("groupCommentsByDay groups consecutive comments of the same day", () => {
  const groups = groupCommentsByDay([
    comment("a", new Date(2026, 5, 15, 9, 0)),
    comment("b", new Date(2026, 5, 15, 18, 0)),
    comment("c", new Date(2026, 5, 14, 12, 0)),
  ]);
  assert.deepEqual(
    groups.map((g) => g.items.map((c) => c.id)),
    [["a", "b"], ["c"]],
  );
});

test("groupCommentsByDay starts a new group when a day repeats later", () => {
  const groups = groupCommentsByDay([
    comment("a", new Date(2026, 5, 15, 9, 0)),
    comment("b", new Date(2026, 5, 14, 9, 0)),
    comment("c", new Date(2026, 5, 15, 9, 0)),
  ]);
  assert.equal(groups.length, 3);
});

test("groupCommentsByDay returns nothing for no comments", () => {
  assert.deepEqual(groupCommentsByDay([]), []);
});
