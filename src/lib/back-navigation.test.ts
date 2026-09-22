import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveBack, taskHref } from "./back-navigation";

const project = { id: "p1", name: "Mi proyecto" };

test("taskHref adds the source only when there is one", () => {
  assert.equal(taskHref("p1", "t1"), "/projects/p1/tasks/t1");
  assert.equal(taskHref("p1", "t1", "hoy"), "/projects/p1/tasks/t1?from=hoy");
});

test("resolveBack returns the screen the task was opened from", () => {
  assert.deepEqual(resolveBack("hoy", project), { href: "/", label: "Hoy" });
  assert.deepEqual(resolveBack("tasks", project), {
    href: "/tasks",
    label: "Tareas",
  });
});

test("resolveBack falls back to the project when the source is missing or unknown", () => {
  const fallback = { href: "/projects/p1", label: "Mi proyecto" };
  assert.deepEqual(resolveBack(undefined, project), fallback);
  assert.deepEqual(resolveBack("https://evil.example", project), fallback);
  assert.deepEqual(resolveBack("toString", project), fallback);
  assert.deepEqual(resolveBack(["hoy", "tasks"], project), fallback);
});
