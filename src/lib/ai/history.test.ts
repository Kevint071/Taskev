import assert from "node:assert/strict";
import { test } from "node:test";
import { RESULT_PREVIEW, renderTurnsFor } from "./history";
import type { HistoryStep } from "./provider";

const user = (text: string): HistoryStep => ({
  type: "user_input",
  content: [{ type: "text", text }],
});

const output = (text: string, provider: string): HistoryStep => ({
  type: "model_output",
  content: [{ type: "text", text }],
  provider,
});

const call = (
  id: string,
  name: string,
  args: Record<string, unknown>,
  provider: string,
): HistoryStep => ({
  type: "function_call",
  id,
  name,
  arguments: args,
  provider,
});

const result = (
  callId: string,
  name: string,
  value: Record<string, unknown>,
): HistoryStep => ({
  type: "function_result",
  call_id: callId,
  name,
  result: value,
});

// A closed Gemini turn that looked up the blocked tasks.
const GEMINI_TURN: HistoryStep[] = [
  user("¿Qué tengo bloqueado?"),
  { type: "thought", signature: "sig-1", provider: "gemini" },
  call("g1", "list_tasks", { status: "bloqueada" }, "gemini"),
  result("g1", "list_tasks", { tasks: [{ id: "t-1", title: "Factura" }] }),
  { type: "thought", signature: "sig-2", provider: "gemini" },
  output("Tienes 1 tarea bloqueada: Factura.", "gemini"),
];

test("keeps turns produced by the target provider as they are", () => {
  const history = [...GEMINI_TURN, user("gracias")];
  assert.deepEqual(renderTurnsFor("gemini", history), history);
});

test("collapses a closed turn from another provider to text", () => {
  const rendered = renderTurnsFor("groq", [
    ...GEMINI_TURN,
    user("desbloquea la primera"),
  ]);
  assert.deepEqual(rendered, [
    user("¿Qué tengo bloqueado?"),
    output(
      'Tienes 1 tarea bloqueada: Factura.\n\nAcciones realizadas en este turno:\n- list_tasks({"status":"bloqueada"}) → {"tasks":[{"id":"t-1","title":"Factura"}]}',
      "groq",
    ),
    user("desbloquea la primera"),
  ]);
});

test("marks failed calls and truncates long results", () => {
  const long = { text: "x".repeat(RESULT_PREVIEW * 2) };
  const rendered = renderTurnsFor("gemini", [
    user("hazlo"),
    call("q1", "get_task", { taskId: "t-1" }, "groq"),
    call("q2", "update_task", { taskId: "t-9" }, "groq"),
    result("q1", "get_task", long),
    {
      ...result("q2", "update_task", { error: "Tarea no encontrada" }),
      is_error: true,
    },
    output("Listo a medias.", "groq"),
    user("¿y ahora?"),
  ]);
  const text = (rendered[1].content as { text: string }[])[0].text;
  const [, getLine, updateLine] = text.split("\n- ");
  assert.ok(getLine.startsWith('get_task({"taskId":"t-1"}) → {"text":"xxx'));
  assert.ok(getLine.endsWith("…"));
  assert.ok(getLine.length < RESULT_PREVIEW + 60);
  assert.equal(
    updateLine,
    'update_task({"taskId":"t-9"}) → error: {"error":"Tarea no encontrada"}',
  );
});

test("collapses a turn that mixes providers", () => {
  const rendered = renderTurnsFor("gemini", [
    user("hola"),
    output("Hola.", "gemini"),
    output("¿Algo más?", "groq"),
    user("no"),
  ]);
  assert.deepEqual(rendered, [
    user("hola"),
    output("Hola.\n¿Algo más?", "gemini"),
    user("no"),
  ]);
});

test("drops a collapsed turn's reply when it had neither text nor calls", () => {
  const rendered = renderTurnsFor("groq", [
    user("hola"),
    { type: "thought", signature: "s", provider: "gemini" },
    user("¿sigues ahí?"),
  ]);
  assert.deepEqual(rendered, [user("hola"), user("¿sigues ahí?")]);
});

test("never collapses the current turn", () => {
  const current: HistoryStep[] = [
    user("borra Factura"),
    call("g9", "delete_task", { taskId: "t-1" }, "gemini"),
  ];
  const rendered = renderTurnsFor("groq", [...GEMINI_TURN, ...current]);
  assert.deepEqual(rendered.slice(-2), current);
});

test("does not mutate the stored history", () => {
  const history = [...GEMINI_TURN, user("siguiente")];
  const copy = structuredClone(history);
  renderTurnsFor("groq", history);
  assert.deepEqual(history, copy);
});
