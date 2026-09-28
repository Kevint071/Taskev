import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type AgentDeps,
  AgentInputError,
  MAX_TOOL_CALLS,
  runAgent,
} from "./agent";
import type { GenerateResult, HistoryStep } from "./provider";

type Call = { id: string; name: string; args?: Record<string, unknown> };

/** A model step as Gemini returns it: a thought, then text and/or calls. */
function step(text: string, calls: Call[] = []): GenerateResult {
  return {
    text,
    calls: calls.map((c) => ({ id: c.id, name: c.name, args: c.args ?? {} })),
    steps: [
      { type: "thought", signature: `sig-${Math.random()}` },
      ...(text
        ? [{ type: "model_output", content: [{ type: "text", text }] }]
        : []),
      ...calls.map((c) => ({
        type: "function_call",
        id: c.id,
        name: c.name,
        arguments: c.args ?? {},
      })),
    ],
  };
}

const DESTRUCTIVE = new Set(["delete_task", "delete_group", "archive_group"]);

/** Scripted model plus recording executor. */
function fakeDeps(script: GenerateResult[], opts: { missing?: string[] } = {}) {
  const seen: HistoryStep[][] = [];
  const executed: Call[] = [];
  const deps: AgentDeps = {
    async generate(history) {
      seen.push(structuredClone(history));
      const next = script.shift();
      assert.ok(next, "model called more times than scripted");
      return next;
    },
    async execute(name, args) {
      executed.push({ id: "", name, args });
      return {
        isError: false,
        result: { ok: name },
        display: `Hecho: ${name}`,
      };
    },
    async describe(name, args) {
      if (opts.missing?.includes(String(args.id))) {
        return {
          ok: false,
          outcome: { isError: true, result: { error: "Tarea no encontrada" } },
        };
      }
      return { ok: true, summary: `Confirmar ${name} ${String(args.id)}` };
    },
    isDestructive: (name) => DESTRUCTIVE.has(name),
  };
  return { deps, seen, executed, remaining: script };
}

function results(history: HistoryStep[]) {
  return history.filter((s) => s.type === "function_result");
}

/** Every function_call has exactly one function_result with its id. */
function assertPaired(history: HistoryStep[]) {
  const calls = history
    .filter((s) => s.type === "function_call")
    .map((s) => s.id);
  const answered = results(history).map((s) => s.call_id);
  assert.deepEqual([...answered].sort(), [...calls].sort());
}

test("a text-only answer ends the turn", async () => {
  const { deps, seen } = fakeDeps([step("Hola, ¿en qué te ayudo?")]);
  const out = await runAgent(deps, [], { message: "hola" });

  assert.deepEqual(seen[0], [
    { type: "user_input", content: [{ type: "text", text: "hola" }] },
  ]);
  assert.deepEqual(out.display, [
    { type: "text", text: "Hola, ¿en qué te ayudo?" },
  ]);
  assert.equal(out.pending, null);
  // The model's steps (thought included) are kept verbatim.
  assert.equal(out.history.length, 1 + 2);
  assert.equal(out.history[1].type, "thought");
});

test("a safe tool runs and the loop continues with its result", async () => {
  const { deps, seen, executed } = fakeDeps([
    step("", [{ id: "c1", name: "list_tasks", args: { status: "bloqueada" } }]),
    step("Tienes 1 tarea bloqueada."),
  ]);
  const out = await runAgent(deps, [], { message: "¿qué tengo bloqueado?" });

  assert.deepEqual(executed, [
    { id: "", name: "list_tasks", args: { status: "bloqueada" } },
  ]);
  const [result] = results(seen[1]);
  assert.deepEqual(result, {
    type: "function_result",
    call_id: "c1",
    name: "list_tasks",
    result: { ok: "list_tasks" },
  });
  assert.deepEqual(out.display, [
    { type: "action", text: "Hecho: list_tasks", isError: false },
    { type: "text", text: "Tienes 1 tarea bloqueada." },
  ]);
  assertPaired(out.history);
});

test("several calls in one step are all answered by id", async () => {
  const { deps, seen } = fakeDeps([
    step("", [
      { id: "a", name: "update_task", args: { id: 1 } },
      { id: "b", name: "update_task", args: { id: 2 } },
      { id: "c", name: "update_task", args: { id: 3 } },
    ]),
    step("Listo."),
  ]);
  const out = await runAgent(deps, [], { message: "pasa las tres a en curso" });

  assert.deepEqual(
    results(seen[1]).map((r) => r.call_id),
    ["a", "b", "c"],
  );
  assertPaired(out.history);
});

test("a destructive call is returned as pending without running", async () => {
  const { deps, executed, remaining } = fakeDeps([
    step("", [{ id: "d1", name: "delete_task", args: { id: "t1" } }]),
  ]);
  const out = await runAgent(deps, [], { message: "borra la tarea" });

  assert.deepEqual(executed, []);
  assert.deepEqual(out.pending, {
    callId: "d1",
    name: "delete_task",
    summary: "Confirmar delete_task t1",
  });
  assert.equal(results(out.history).length, 0);
  assert.equal(remaining.length, 0);
});

test("in a mixed step the safe call runs and the destructive one waits", async () => {
  const { deps, executed } = fakeDeps([
    step("", [
      { id: "d1", name: "archive_group", args: { id: "g1" } },
      { id: "s1", name: "add_comment", args: { id: "t1" } },
    ]),
  ]);
  const out = await runAgent(deps, [], { message: "comenta y archiva" });

  assert.deepEqual(
    executed.map((c) => c.name),
    ["add_comment"],
  );
  assert.equal(out.pending?.callId, "d1");
  assert.deepEqual(
    results(out.history).map((r) => r.call_id),
    ["s1"],
  );
});

test("an approved confirmation runs the action and continues", async () => {
  const first = fakeDeps([
    step("", [{ id: "d1", name: "delete_task", args: { id: "t1" } }]),
  ]);
  const paused = await runAgent(first.deps, [], { message: "borra la tarea" });

  const second = fakeDeps([step("Tarea eliminada.")]);
  const out = await runAgent(second.deps, paused.history, {
    confirmation: { callId: "d1", approved: true },
  });

  assert.deepEqual(
    second.executed.map((c) => c.name),
    ["delete_task"],
  );
  assert.deepEqual(results(second.seen[0]).at(-1), {
    type: "function_result",
    call_id: "d1",
    name: "delete_task",
    result: { ok: "delete_task" },
  });
  assert.equal(out.pending, null);
  assert.deepEqual(out.display.at(-1), {
    type: "text",
    text: "Tarea eliminada.",
  });
  assertPaired(out.history);
});

test("a rejected confirmation answers rejected without running", async () => {
  const first = fakeDeps([
    step("", [{ id: "d1", name: "archive_group", args: { id: "g1" } }]),
  ]);
  const paused = await runAgent(first.deps, [], { message: "archiva" });

  const second = fakeDeps([step("De acuerdo, no lo archivo.")]);
  const out = await runAgent(second.deps, paused.history, {
    confirmation: { callId: "d1", approved: false },
  });

  assert.deepEqual(second.executed, []);
  const answer = results(second.seen[0]).at(-1);
  assert.equal(answer?.call_id, "d1");
  assert.deepEqual((answer?.result as { rejected?: boolean }).rejected, true);
  assert.deepEqual(out.display[0], {
    type: "action",
    text: "Cancelado: Confirmar archive_group g1",
    isError: false,
  });
  assertPaired(out.history);
});

test("two destructive calls are confirmed one at a time", async () => {
  const first = fakeDeps([
    step("", [
      { id: "d1", name: "delete_task", args: { id: "t1" } },
      { id: "d2", name: "delete_task", args: { id: "t2" } },
    ]),
  ]);
  const paused = await runAgent(first.deps, [], { message: "borra ambas" });
  assert.equal(paused.pending?.callId, "d1");

  // Confirming the first surfaces the second without calling the model.
  const second = fakeDeps([]);
  const next = await runAgent(second.deps, paused.history, {
    confirmation: { callId: "d1", approved: true },
  });
  assert.equal(second.seen.length, 0);
  assert.equal(next.pending?.callId, "d2");
  assert.equal(next.pending?.summary, "Confirmar delete_task t2");

  const third = fakeDeps([step("Borré las dos.")]);
  const done = await runAgent(third.deps, next.history, {
    confirmation: { callId: "d2", approved: true },
  });
  assert.equal(done.pending, null);
  assertPaired(done.history);
});

test(`after ${MAX_TOOL_CALLS} tool calls the rest get step_limit`, async () => {
  const batch = (from: number, n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `c${from + i}`,
      name: "update_task",
      args: { id: from + i },
    }));
  const { deps, executed, remaining } = fakeDeps([
    step("", batch(0, 5)),
    step("", batch(5, 5)),
    step("nunca llega"),
  ]);
  const out = await runAgent(deps, [], { message: "actualiza diez tareas" });

  assert.equal(MAX_TOOL_CALLS, 8);
  assert.equal(executed.length, 8);
  // The model is not called again, and the history stays valid.
  assert.equal(remaining.length, 1);
  assertPaired(out.history);
  const limited = results(out.history).filter(
    (r) => (r.result as { error?: string }).error === "step_limit",
  );
  assert.deepEqual(
    limited.map((r) => r.call_id),
    ["c8", "c9"],
  );
  assert.ok(limited.every((r) => r.is_error === true));
  const notice = out.display.at(-1);
  assert.equal(notice?.type, "text");
  assert.match(notice?.text ?? "", /límite/);
  assert.match(notice?.text ?? "", /8 acciones/);
  assert.equal(out.pending, null);
});

test("the step limit counts calls confirmed earlier in the same message", async () => {
  const first = fakeDeps([
    step("", [
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `s${i}`,
        name: "update_task",
      })),
      { id: "d1", name: "delete_task", args: { id: "t1" } },
    ]),
  ]);
  const paused = await runAgent(first.deps, [], { message: "muchas cosas" });
  assert.equal(paused.pending?.callId, "d1");

  const second = fakeDeps([step("", [{ id: "x", name: "update_task" }])]);
  const out = await runAgent(second.deps, paused.history, {
    confirmation: { callId: "d1", approved: true },
  });
  // 7 safe + 1 confirmed = 8: the next call is refused.
  assert.deepEqual(
    second.executed.map((c) => c.name),
    ["delete_task"],
  );
  assert.equal(
    (results(out.history).at(-1)?.result as { error?: string }).error,
    "step_limit",
  );
  assertPaired(out.history);
});

test("an unknown confirmation callId is rejected", async () => {
  const first = fakeDeps([
    step("", [{ id: "d1", name: "delete_task", args: { id: "t1" } }]),
  ]);
  const paused = await runAgent(first.deps, [], { message: "borra" });

  const second = fakeDeps([]);
  await assert.rejects(
    runAgent(second.deps, paused.history, {
      confirmation: { callId: "nope", approved: true },
    }),
    AgentInputError,
  );
  // An already answered (safe) call can't be "confirmed" either.
  const safe = fakeDeps([
    step("", [{ id: "s1", name: "list_tasks" }]),
    step("ok"),
  ]);
  const done = await runAgent(safe.deps, [], { message: "lista" });
  await assert.rejects(
    runAgent(fakeDeps([]).deps, done.history, {
      confirmation: { callId: "s1", approved: true },
    }),
    AgentInputError,
  );
  assert.deepEqual(second.executed, []);
});

test("a destructive call on a missing item answers the error to the model", async () => {
  const { deps, seen } = fakeDeps(
    [
      step("", [{ id: "d1", name: "delete_task", args: { id: "ghost" } }]),
      step("No encontré esa tarea."),
    ],
    { missing: ["ghost"] },
  );
  const out = await runAgent(deps, [], { message: "borra ghost" });

  assert.equal(out.pending, null);
  assert.deepEqual(results(seen[1])[0], {
    type: "function_result",
    call_id: "d1",
    name: "delete_task",
    result: { error: "Tarea no encontrada" },
    is_error: true,
  });
  assertPaired(out.history);
});

test("a new message while an action is pending cancels that action", async () => {
  const first = fakeDeps([
    step("", [{ id: "d1", name: "delete_task", args: { id: "t1" } }]),
  ]);
  const paused = await runAgent(first.deps, [], { message: "borra" });

  const second = fakeDeps([step("Vale, dime.")]);
  const out = await runAgent(second.deps, paused.history, {
    message: "mejor no, otra cosa",
  });
  assert.deepEqual(second.executed, []);
  const history = second.seen[0];
  const cancelled = results(history).at(-1);
  assert.equal(cancelled?.call_id, "d1");
  assert.equal((cancelled?.result as { rejected?: boolean }).rejected, true);
  assert.equal(history.at(-1)?.type, "user_input");
  assertPaired(out.history);
});
