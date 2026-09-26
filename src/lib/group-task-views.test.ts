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
    { id: "a", status: "disponible", dueDate: due },
    { id: "b", status: "en_curso", dueDate: null },
    { id: "c", status: "completada", dueDate: due },
    { id: "d", status: "completada", dueDate: null },
    { id: "e", status: "bloqueada", dueDate: due },
  ];
  const split = splitGroupTasks(tasks);
  assert.deepEqual(
    split.pendientes.map((t) => t.id),
    ["a", "e"],
  );
  assert.deepEqual(
    split.no_programadas.map((t) => t.id),
    ["b"],
  );
  assert.deepEqual(
    split.completadas.map((t) => t.id),
    ["c", "d"],
  );
});
