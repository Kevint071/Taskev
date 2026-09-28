import assert from "node:assert/strict";
import { test } from "node:test";
import { createGeminiClient } from "./gemini";
import {
  type HistoryStep,
  ProviderError,
  type ProviderErrorKind,
} from "./provider";

const API_KEY = "AIzaSyTEST-secret-key-9876";

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

// Recorded shape of an interaction that answers with plain text.
const TEXT_RESPONSE = {
  id: "v1_abc",
  object: "interaction",
  status: "completed",
  steps: [
    { type: "thought", signature: "sig-1" },
    {
      type: "model_output",
      content: [
        { type: "text", text: "Tienes 2 tareas " },
        { type: "text", text: "bloqueadas." },
      ],
    },
  ],
};

// Recorded shape of an interaction that asks for two tool calls.
const CALL_RESPONSE = {
  id: "v1_def",
  object: "interaction",
  status: "requires_action",
  steps: [
    { type: "thought", signature: "sig-2" },
    {
      type: "function_call",
      id: "gth23981",
      name: "list_tasks",
      arguments: { status: "bloqueada" },
    },
    { type: "function_call", id: "gth23982", name: "list_groups" },
  ],
};

test("generate posts a stateless interaction with the key in a header", async () => {
  const { calls, fetchImpl } = fakeFetch(() => json(200, TEXT_RESPONSE));
  await createGeminiClient(fetchImpl).generate(API_KEY, HISTORY, TOOLS, "sys");

  assert.equal(calls.length, 1);
  const [{ url, init }] = calls;
  assert.equal(
    url,
    "https://generativelanguage.googleapis.com/v1beta/interactions",
  );
  assert.ok(!url.includes(API_KEY));
  assert.equal(init.method, "POST");
  assert.equal(new Headers(init.headers).get("x-goog-api-key"), API_KEY);
  const body = JSON.parse(String(init.body));
  assert.equal(body.store, false);
  assert.deepEqual(body.input, HISTORY);
  assert.deepEqual(body.tools, TOOLS);
  assert.equal(body.system_instruction, "sys");
  assert.equal(typeof body.model, "string");
});

test("generate extracts the text of the model output", async () => {
  const { fetchImpl } = fakeFetch(() => json(200, TEXT_RESPONSE));
  const result = await createGeminiClient(fetchImpl).generate(
    API_KEY,
    HISTORY,
    TOOLS,
    "sys",
  );
  assert.equal(result.text, "Tienes 2 tareas bloqueadas.");
  assert.deepEqual(result.calls, []);
  // Every model step, thoughts included, is kept for the history, tagged
  // with its provider.
  assert.deepEqual(
    result.steps,
    TEXT_RESPONSE.steps.map((s) => ({ ...s, provider: "gemini" })),
  );
});

test("generate extracts function calls with their ids", async () => {
  const { fetchImpl } = fakeFetch(() => json(200, CALL_RESPONSE));
  const result = await createGeminiClient(fetchImpl).generate(
    API_KEY,
    HISTORY,
    TOOLS,
    "sys",
  );
  assert.equal(result.text, "");
  assert.deepEqual(result.calls, [
    { id: "gth23981", name: "list_tasks", args: { status: "bloqueada" } },
    { id: "gth23982", name: "list_groups", args: {} },
  ]);
  assert.deepEqual(
    result.steps,
    CALL_RESPONSE.steps.map((s) => ({ ...s, provider: "gemini" })),
  );
});

test("generate strips the provider tag from its own steps before sending", async () => {
  const { calls, fetchImpl } = fakeFetch(() => json(200, TEXT_RESPONSE));
  const history: HistoryStep[] = [
    ...HISTORY,
    { type: "thought", signature: "sig-0", provider: "gemini" },
    {
      type: "model_output",
      content: [{ type: "text", text: "Hola" }],
      provider: "gemini",
    },
    { type: "user_input", content: [{ type: "text", text: "¿y hoy?" }] },
  ];
  await createGeminiClient(fetchImpl).generate(API_KEY, history, TOOLS, "sys");
  const body = JSON.parse(String(calls[0].init.body));
  assert.deepEqual(body.input, [
    ...HISTORY,
    { type: "thought", signature: "sig-0" },
    { type: "model_output", content: [{ type: "text", text: "Hola" }] },
    { type: "user_input", content: [{ type: "text", text: "¿y hoy?" }] },
  ]);
});

async function kindOf(
  promise: Promise<unknown>,
): Promise<{ kind: ProviderErrorKind; message: string }> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof ProviderError, String(error));
    assert.equal(error.provider, "gemini");
    return { kind: error.kind, message: `${error.message} ${error.stack}` };
  }
  assert.fail("expected a ProviderError");
}

const INVALID_KEY_BODY = {
  error: {
    code: 400,
    message: `API key not valid. Please pass a valid API key. (${API_KEY})`,
    status: "INVALID_ARGUMENT",
    details: [{ reason: "API_KEY_INVALID" }],
  },
};

const errorCases: [string, () => Response, ProviderErrorKind][] = [
  ["400 invalid key", () => json(400, INVALID_KEY_BODY), "invalid_key"],
  [
    "400 other",
    () =>
      json(400, {
        error: { code: 400, message: "bad", status: "INVALID_ARGUMENT" },
      }),
    "bad_request",
  ],
  ["401", () => json(401, { error: { code: 401 } }), "invalid_key"],
  ["403", () => json(403, { error: { code: 403 } }), "invalid_key"],
  ["429", () => json(429, { error: { code: 429 } }), "quota"],
  ["500", () => json(500, { error: { code: 500 } }), "unavailable"],
  ["503", () => new Response("down", { status: 503 }), "unavailable"],
  [
    "failed interaction",
    () => json(200, { status: "failed", steps: [] }),
    "unavailable",
  ],
];

for (const [label, respond, expected] of errorCases) {
  test(`generate maps ${label} to ${expected} without leaking the key`, async () => {
    const { fetchImpl } = fakeFetch(respond);
    const { kind, message } = await kindOf(
      createGeminiClient(fetchImpl).generate(API_KEY, HISTORY, TOOLS, "sys"),
    );
    assert.equal(kind, expected);
    assert.ok(!message.includes(API_KEY));
  });
}

test("generate maps network errors to unavailable without leaking the key", async () => {
  const { fetchImpl } = fakeFetch(() => {
    throw new TypeError(`fetch failed for key ${API_KEY}`);
  });
  const { kind, message } = await kindOf(
    createGeminiClient(fetchImpl).generate(API_KEY, HISTORY, TOOLS, "sys"),
  );
  assert.equal(kind, "unavailable");
  assert.ok(!message.includes(API_KEY));
});

test("verifyKey lists one model with the key in a header", async () => {
  const { calls, fetchImpl } = fakeFetch(() => json(200, { models: [] }));
  await createGeminiClient(fetchImpl).verifyKey(API_KEY);
  const [{ url, init }] = calls;
  assert.equal(
    url,
    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
  );
  assert.equal(new Headers(init.headers).get("x-goog-api-key"), API_KEY);
});

const verifyCases: [number, ProviderErrorKind][] = [
  [400, "invalid_key"],
  [401, "invalid_key"],
  [403, "invalid_key"],
  [429, "quota"],
  [502, "unavailable"],
];

for (const [status, expected] of verifyCases) {
  test(`verifyKey maps ${status} to ${expected}`, async () => {
    const { fetchImpl } = fakeFetch(() => json(status, INVALID_KEY_BODY));
    const { kind, message } = await kindOf(
      createGeminiClient(fetchImpl).verifyKey(API_KEY),
    );
    assert.equal(kind, expected);
    assert.ok(!message.includes(API_KEY));
  });
}

test("generate sends closed turns from another provider as text", async () => {
  const { calls, fetchImpl } = fakeFetch(() => json(200, TEXT_RESPONSE));
  await createGeminiClient(fetchImpl).generate(
    API_KEY,
    [
      ...HISTORY,
      {
        type: "function_call",
        id: "fc_1",
        name: "list_groups",
        arguments: {},
        provider: "groq",
      },
      {
        type: "function_result",
        call_id: "fc_1",
        name: "list_groups",
        result: { groups: [] },
      },
      {
        type: "model_output",
        content: [{ type: "text", text: "No tienes grupos." }],
        provider: "groq",
      },
      { type: "user_input", content: [{ type: "text", text: "crea uno" }] },
    ],
    TOOLS,
    "sys",
  );
  const body = JSON.parse(String(calls[0].init.body));
  assert.deepEqual(
    body.input.map((s: { type: string }) => s.type),
    ["user_input", "model_output", "user_input"],
  );
});
