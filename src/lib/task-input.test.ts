import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_TASK_TITLE_LENGTH } from "./constraints";
import {
  parseTaskFields,
  progressRuleError,
  statusRuleError,
  unpinOnCompletion,
} from "./task-input";

const EMPTY = "vacío";

test("unpinOnCompletion: completing a task drops its pin, even if one is requested", () => {
  assert.deepEqual(unpinOnCompletion({ status: "completada" }), {
    status: "completada",
    pinnedToday: false,
  });
  assert.deepEqual(
    unpinOnCompletion({ status: "completada", pinnedToday: true }),
    { status: "completada", pinnedToday: false },
  );
});

test("unpinOnCompletion: leaves every other change untouched", () => {
  const pin = { pinnedToday: true };
  assert.equal(unpinOnCompletion(pin), pin);
  const reopen = { status: "en_curso", pinnedToday: true };
  assert.equal(unpinOnCompletion(reopen), reopen);
});

test("parseTaskFields: leaves absent fields out", () => {
  assert.deepEqual(parseTaskFields({}, EMPTY), { ok: true, value: {} });
  assert.deepEqual(parseTaskFields(null, EMPTY), { ok: true, value: {} });
});

test("parseTaskFields: normalizes every field of a full draft", () => {
  const result = parseTaskFields(
    {
      title: "  Preparar demo  ",
      description: "Notas",
      status: "en_curso",
      progressPct: 42.4,
      priority: 2.5,
      dueDate: "2026-10-01T00:00:00.000Z",
      pinnedToday: true,
    },
    EMPTY,
  );
  assert.deepEqual(result, {
    ok: true,
    value: {
      title: "Preparar demo",
      description: "Notas",
      status: "en_curso",
      progressPct: 42,
      priority: "2.5",
      dueDate: new Date("2026-10-01T00:00:00.000Z"),
      pinnedToday: true,
    },
  });
});

test("parseTaskFields: null clears dates, non-strings clear the description", () => {
  const result = parseTaskFields(
    { dueDate: null, completedAt: null, description: 3 },
    EMPTY,
  );
  assert.deepEqual(result, {
    ok: true,
    value: { dueDate: null, completedAt: null, description: null },
  });
});

test("parseTaskFields: rejects invalid values with their message", () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ title: "   " }, EMPTY],
    [
      { title: "x".repeat(MAX_TASK_TITLE_LENGTH + 1) },
      `El título no puede tener más de ${MAX_TASK_TITLE_LENGTH} caracteres`,
    ],
    [{ status: "hecha" }, "Estado inválido"],
    [{ progressPct: 101 }, "El avance debe estar entre 0 y 100"],
    [{ priority: "alta" }, "Prioridad inválida"],
    [{ dueDate: "mañana" }, "Fecha límite inválida"],
    [{ completedAt: "ayer" }, "Fecha de finalización inválida"],
  ];
  for (const [body, error] of cases) {
    assert.deepEqual(parseTaskFields(body, EMPTY), { ok: false, error });
  }
});

test("statusRuleError: completada needs full progress and a date", () => {
  assert.match(statusRuleError("completada", 90, new Date()) ?? "", /100%/);
  assert.equal(
    statusRuleError("completada", 100, null),
    "Falta la fecha de finalización",
  );
  assert.equal(statusRuleError("completada", 100, new Date()), null);
});

test("statusRuleError: disponible needs no progress and no completion date", () => {
  assert.match(statusRuleError("disponible", 10, null) ?? "", /0%/);
  assert.match(
    statusRuleError("disponible", 0, new Date()) ?? "",
    /fecha de finalización/,
  );
  assert.equal(statusRuleError("disponible", 0, null), null);
});

test("statusRuleError: other statuses accept any progress", () => {
  assert.equal(statusRuleError("en_curso", 70, null), null);
  assert.equal(statusRuleError("pausada", 0, null), null);
});

test("progressRuleError: a disponible task cannot carry progress", () => {
  assert.match(progressRuleError("disponible", 10) ?? "", /disponible/);
  assert.equal(progressRuleError("disponible", 0), null);
  assert.equal(progressRuleError("en_curso", 10), null);
  assert.equal(progressRuleError("completada", 100), null);
});
