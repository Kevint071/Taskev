import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveBack, taskHref } from "./back-navigation";

const group = { id: "p1", name: "Mi grupo" };

test("taskHref adds the source only when there is one", () => {
  assert.equal(taskHref("p1", "t1"), "/groups/p1/tasks/t1");
  assert.equal(taskHref("p1", "t1", "hoy"), "/groups/p1/tasks/t1?from=hoy");
});

test("resolveBack returns the screen the task was opened from", () => {
  assert.deepEqual(resolveBack("hoy", group), { href: "/", label: "Hoy" });
  assert.deepEqual(resolveBack("tasks", group), {
    href: "/tasks",
    label: "Tareas",
  });
});

test("resolveBack falls back to the group when the source is missing or unknown", () => {
  const fallback = { href: "/groups/p1", label: "Mi grupo" };
  assert.deepEqual(resolveBack(undefined, group), fallback);
  assert.deepEqual(resolveBack("https://evil.example", group), fallback);
  assert.deepEqual(resolveBack("toString", group), fallback);
  assert.deepEqual(resolveBack(["hoy", "tasks"], group), fallback);
});
