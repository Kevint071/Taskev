import assert from "node:assert/strict";
import { test } from "node:test";
import {
  groupTaskViewHref,
  parseGroupTaskView,
  splitGroupTasks,
} from "./group-task-views";

test("parseGroupTaskView keeps known views", () => {
  assert.equal(parseGroupTaskView("completadas"), "completadas");
  assert.equal(parseGroupTaskView("no_programadas"), "no_programadas");
});

test("parseGroupTaskView falls back to pendientes", () => {
  assert.equal(parseGroupTaskView(null), "pendientes");
  assert.equal(parseGroupTaskView("toString"), "pendientes");
  assert.equal(parseGroupTaskView("COMPLETADAS"), "pendientes");
});

test("groupTaskViewHref omits the param for the default view", () => {
  assert.equal(groupTaskViewHref("p1", "pendientes"), "/groups/p1");
  assert.equal(
    groupTaskViewHref("p1", "completadas"),
    "/groups/p1?vista=completadas",
  );
});

test("splitGroupTasks puts every task in exactly one view", () => {
  const due = "2026-09-30T00:00:00.000Z";
  const tasks = [
    { id: "date", status: "disponible", dueDate: due, priority: "0" },
    { id: "prio", status: "en_curso", dueDate: null, priority: "2.50" },
    { id: "both", status: "bloqueada", dueDate: due, priority: "1" },
    { id: "none", status: "pausada", dueDate: null, priority: "0.00" },
    { id: "done-dated", status: "completada", dueDate: due, priority: "3" },
    { id: "done-bare", status: "completada", dueDate: null, priority: "0" },
  ];
  const ids = (list: { id: string }[]) => list.map((t) => t.id);
  const split = splitGroupTasks(tasks);
  assert.deepEqual(ids(split.pendientes), ["date", "prio", "both"]);
  assert.deepEqual(ids(split.no_programadas), ["none"]);
  assert.deepEqual(ids(split.completadas), ["done-dated", "done-bare"]);
});
