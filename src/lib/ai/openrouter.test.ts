import assert from "node:assert/strict";
import { test } from "node:test";
import { createOpenRouterClient, OPENROUTER_MODEL } from "./openrouter";
import {
  type HistoryStep,
  ProviderError,
  type ProviderErrorKind,
} from "./provider";

const API_KEY = "sk-or-v1-TEST-secret-key-9876";

const TOOLS = [
  {
    type: "function" as const,
    name: "list_tasks",
    description: "Lists tasks",
    parameters: { type: "object", properties: {} },
  },
];

const HISTORY: HistoryStep[] = [
  { type: "user_input", content: [{ type: "text", text: "hola" }] },
];

type Call = { url: string; init: RequestInit };

function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetchImpl = async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    calls.push({ url: String(input), init: init ?? {} });
    return respond();
  };
  return { calls, fetchImpl: fetchImpl as typeof fetch };
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const TEXT_RESPONSE = {
  id: "gen-1",
  object: "chat.completion",
  model: OPENROUTER_MODEL,
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: "Tienes 2 tareas bloqueadas.",
        reasoning: "El usuario quiere saber...",
      },
      finish_reason: "stop",
    },
  ],
};

function openRouterError(status: number, message: string) {
  return () => json(status, { error: { message, code: status } });
}

async function kindOf(promise: Promise<unknown>) {
  try {
    await promise;
    assert.fail("expected a ProviderError");
  } catch (error) {
    assert.ok(error instanceof ProviderError);
    return { kind: error.kind, message: error.message };
  }
}

test("generate posts to OpenRouter with the key as a bearer token", async () => {
  const { calls, fetchImpl } = fakeFetch(() => json(200, TEXT_RESPONSE));
  await createOpenRouterClient(fetchImpl).generate(
    API_KEY,
    HISTORY,
    TOOLS,
    "sys",
  );

  assert.equal(calls.length, 1);
  const [{ url, init }] = calls;
  assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
  assert.ok(!url.includes(API_KEY));
  assert.equal(init.method, "POST");
  const headers = new Headers(init.headers);
  assert.equal(headers.get("authorization"), `Bearer ${API_KEY}`);
  assert.equal(headers.get("x-title"), "Taskev");
  const body = JSON.parse(String(init.body));
  assert.equal(body.model, OPENROUTER_MODEL);
  assert.deepEqual(body.messages, [
    { role: "system", content: "sys" },
    { role: "user", content: "hola" },
  ]);
  assert.equal(body.tools[0].function.name, "list_tasks");
});

test("generate tags the steps it returns as openrouter's", async () => {
  const { fetchImpl } = fakeFetch(() => json(200, TEXT_RESPONSE));
  const { steps, text } = await createOpenRouterClient(fetchImpl).generate(
    API_KEY,
    HISTORY,
    TOOLS,
    "sys",
  );
  assert.equal(text, "Tienes 2 tareas bloqueadas.");
  assert.deepEqual(
    steps.map((step) => [step.type, step.provider]),
    [
      ["reasoning", "openrouter"],
      ["model_output", "openrouter"],
    ],
  );
});

test("generate keeps another provider's reasoning out of the request", async () => {
  const { calls, fetchImpl } = fakeFetch(() => json(200, TEXT_RESPONSE));
  await createOpenRouterClient(fetchImpl).generate(
    API_KEY,
    [
      ...HISTORY,
      { type: "reasoning", text: "pensado en Groq", provider: "groq" },
      {
        type: "function_call",
        id: "fc_1",
        name: "list_tasks",
        arguments: {},
        provider: "groq",
      },
      { type: "function_result", call_id: "fc_1", result: { tasks: [] } },
    ],
    TOOLS,
    "sys",
  );
  const body = JSON.parse(String(calls[0].init.body));
  const assistant = body.messages.find(
    (m: { role: string }) => m.role === "assistant",
  );
  assert.equal(assistant.reasoning, undefined);
  assert.equal(assistant.tool_calls[0].id, "fc_1");
});

test("verifyKey asks for the key's own record", async () => {
  const { calls, fetchImpl } = fakeFetch(() => json(200, { data: {} }));
  await createOpenRouterClient(fetchImpl).verifyKey(API_KEY);
  const [{ url, init }] = calls;
  assert.equal(url, "https://openrouter.ai/api/v1/key");
  assert.equal(init.method, "GET");
  assert.equal(
    new Headers(init.headers).get("authorization"),
    `Bearer ${API_KEY}`,
  );
});

const errorCases: [number, ProviderErrorKind][] = [
  [401, "invalid_key"],
  [403, "invalid_key"],
  // OpenRouter charges per request; an account out of credits gets a 402.
  [402, "quota"],
  [429, "quota"],
  [503, "unavailable"],
];

for (const [status, expected] of errorCases) {
  test(`maps ${status} to ${expected} without leaking the key`, async () => {
    const { fetchImpl } = fakeFetch(openRouterError(status, `nope ${API_KEY}`));
    const { kind, message } = await kindOf(
      createOpenRouterClient(fetchImpl).generate(API_KEY, HISTORY, TOOLS, "s"),
    );
    assert.equal(kind, expected);
    assert.ok(!message.includes(API_KEY));
  });
}

test("errors name OpenRouter, not Groq", async () => {
  const { fetchImpl } = fakeFetch(openRouterError(401, "no"));
  const { message } = await kindOf(
    createOpenRouterClient(fetchImpl).verifyKey(API_KEY),
  );
  assert.match(message, /^OpenRouter request failed: invalid_key/);
});
