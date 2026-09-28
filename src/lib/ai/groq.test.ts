import assert from "node:assert/strict";
import { test } from "node:test";
import { createGroqClient, GROQ_MODEL } from "./groq";
import {
  type HistoryStep,
  ProviderError,
  type ProviderErrorKind,
} from "./provider";

const API_KEY = "gsk_TEST-secret-key-9876";

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

function completion(message: Record<string, unknown>) {
  return {
    id: "chatcmpl-1",
    object: "chat.completion",
    model: GROQ_MODEL,
    choices: [
      {
        index: 0,
        message: { role: "assistant", ...message },
        finish_reason: message.tool_calls ? "tool_calls" : "stop",
      },
    ],
  };
}

// Recorded shape of a completion that answers with plain text.
const TEXT_RESPONSE = completion({
  content: "Tienes 2 tareas bloqueadas.",
  reasoning: "El usuario quiere saber...",
});

// Recorded shape of a completion that asks for two tool calls.
const CALL_RESPONSE = completion({
  content: null,
  tool_calls: [
    {
      id: "fc_1",
      type: "function",
      function: { name: "list_tasks", arguments: '{"status":"bloqueada"}' },
    },
    {
      id: "fc_2",
      type: "function",
      function: { name: "list_groups", arguments: "{}" },
    },
  ],
});

async function sentBody(history: HistoryStep[]) {
  const { calls, fetchImpl } = fakeFetch(() => json(200, TEXT_RESPONSE));
  await createGroqClient(fetchImpl).generate(API_KEY, history, TOOLS, "sys");
  return JSON.parse(String(calls[0].init.body));
}

test("generate posts a chat completion with the key as a bearer token", async () => {
  const { calls, fetchImpl } = fakeFetch(() => json(200, TEXT_RESPONSE));
  await createGroqClient(fetchImpl).generate(API_KEY, HISTORY, TOOLS, "sys");

  assert.equal(calls.length, 1);
  const [{ url, init }] = calls;
  assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
  assert.ok(!url.includes(API_KEY));
  assert.equal(init.method, "POST");
  assert.equal(
    new Headers(init.headers).get("authorization"),
    `Bearer ${API_KEY}`,
  );
  const body = JSON.parse(String(init.body));
  assert.equal(body.model, GROQ_MODEL);
  assert.deepEqual(body.messages, [
    { role: "system", content: "sys" },
    { role: "user", content: "hola" },
  ]);
  assert.deepEqual(body.tools, [
    {
      type: "function",
      function: {
        name: "list_tasks",
        description: "Lists tasks",
        parameters: { type: "object", properties: {} },
      },
    },
  ]);
});

test("generate groups a model step into one assistant message with its tool calls", async () => {
  const body = await sentBody([
    ...HISTORY,
    {
      type: "model_output",
      content: [{ type: "text", text: "Busco tus tareas." }],
      provider: "groq",
    },
    {
      type: "function_call",
      id: "fc_1",
      name: "list_tasks",
      arguments: { status: "bloqueada" },
      provider: "groq",
    },
    {
      type: "function_call",
      id: "fc_2",
      name: "list_groups",
      arguments: {},
      provider: "groq",
    },
    {
      type: "function_result",
      call_id: "fc_1",
      name: "list_tasks",
      result: { tasks: [] },
    },
    {
      type: "function_result",
      call_id: "fc_2",
      name: "list_groups",
      result: { error: "step_limit" },
      is_error: true,
    },
  ]);
  assert.deepEqual(body.messages.slice(2), [
    {
      role: "assistant",
      content: "Busco tus tareas.",
      tool_calls: [
        {
          id: "fc_1",
          type: "function",
          function: { name: "list_tasks", arguments: '{"status":"bloqueada"}' },
        },
        {
          id: "fc_2",
          type: "function",
          function: { name: "list_groups", arguments: "{}" },
        },
      ],
    },
    { role: "tool", tool_call_id: "fc_1", content: '{"tasks":[]}' },
    {
      role: "tool",
      tool_call_id: "fc_2",
      content: '{"error":"step_limit"}',
    },
  ]);
});

test("generate sends a tool-only step with null content and a text reply as plain content", async () => {
  const body = await sentBody([
    ...HISTORY,
    {
      type: "function_call",
      id: "fc_1",
      name: "list_tasks",
      arguments: {},
      provider: "groq",
    },
    {
      type: "function_result",
      call_id: "fc_1",
      name: "list_tasks",
      result: {},
    },
    {
      type: "model_output",
      content: [{ type: "text", text: "Nada bloqueado." }],
      provider: "groq",
    },
    { type: "user_input", content: [{ type: "text", text: "gracias" }] },
  ]);
  assert.deepEqual(body.messages.slice(2), [
    {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "fc_1",
          type: "function",
          function: { name: "list_tasks", arguments: "{}" },
        },
      ],
    },
    { role: "tool", tool_call_id: "fc_1", content: "{}" },
    { role: "assistant", content: "Nada bloqueado." },
    { role: "user", content: "gracias" },
  ]);
});

test("generate leaves out steps private to a provider", async () => {
  const body = await sentBody([
    ...HISTORY,
    { type: "reasoning", text: "pienso", provider: "groq" },
    { type: "thought", signature: "sig", provider: "gemini" },
    {
      type: "model_output",
      content: [{ type: "text", text: "Hola" }],
      provider: "groq",
    },
    { type: "user_input", content: [{ type: "text", text: "gracias" }] },
  ]);
  assert.deepEqual(body.messages.slice(2), [
    { role: "assistant", content: "Hola" },
    { role: "user", content: "gracias" },
  ]);
});

test("generate resends the reasoning only within the current turn", async () => {
  const body = await sentBody([
    ...HISTORY,
    { type: "reasoning", text: "turno cerrado", provider: "groq" },
    {
      type: "model_output",
      content: [{ type: "text", text: "Hola" }],
      provider: "groq",
    },
    { type: "user_input", content: [{ type: "text", text: "¿bloqueadas?" }] },
    { type: "reasoning", text: "busco", provider: "groq" },
    {
      type: "function_call",
      id: "fc_1",
      name: "list_tasks",
      arguments: {},
      provider: "groq",
    },
    {
      type: "function_result",
      call_id: "fc_1",
      name: "list_tasks",
      result: {},
    },
  ]);
  assert.deepEqual(body.messages.slice(2), [
    { role: "assistant", content: "Hola" },
    { role: "user", content: "¿bloqueadas?" },
    {
      role: "assistant",
      content: null,
      reasoning: "busco",
      tool_calls: [
        {
          id: "fc_1",
          type: "function",
          function: { name: "list_tasks", arguments: "{}" },
        },
      ],
    },
    { role: "tool", tool_call_id: "fc_1", content: "{}" },
  ]);
});

test("generate extracts the text and keeps the reasoning as a private step", async () => {
  const { fetchImpl } = fakeFetch(() => json(200, TEXT_RESPONSE));
  const result = await createGroqClient(fetchImpl).generate(
    API_KEY,
    HISTORY,
    TOOLS,
    "sys",
  );
  assert.equal(result.text, "Tienes 2 tareas bloqueadas.");
  assert.deepEqual(result.calls, []);
  assert.deepEqual(result.steps, [
    { type: "reasoning", text: "El usuario quiere saber...", provider: "groq" },
    {
      type: "model_output",
      content: [{ type: "text", text: "Tienes 2 tareas bloqueadas." }],
      provider: "groq",
    },
  ]);
});

test("generate extracts tool calls with their ids and parsed arguments", async () => {
  const { fetchImpl } = fakeFetch(() => json(200, CALL_RESPONSE));
  const result = await createGroqClient(fetchImpl).generate(
    API_KEY,
    HISTORY,
    TOOLS,
    "sys",
  );
  assert.equal(result.text, "");
  assert.deepEqual(result.calls, [
    { id: "fc_1", name: "list_tasks", args: { status: "bloqueada" } },
    { id: "fc_2", name: "list_groups", args: {} },
  ]);
  assert.deepEqual(result.steps, [
    {
      type: "function_call",
      id: "fc_1",
      name: "list_tasks",
      arguments: { status: "bloqueada" },
      provider: "groq",
    },
    {
      type: "function_call",
      id: "fc_2",
      name: "list_groups",
      arguments: {},
      provider: "groq",
    },
  ]);
});

test("generate treats arguments that aren't a JSON object as empty", async () => {
  const { fetchImpl } = fakeFetch(() =>
    json(
      200,
      completion({
        content: null,
        tool_calls: [
          {
            id: "fc_1",
            type: "function",
            function: { name: "list_tasks", arguments: "{not json" },
          },
          {
            id: "fc_2",
            type: "function",
            function: { name: "list_groups", arguments: "[1]" },
          },
        ],
      }),
    ),
  );
  const result = await createGroqClient(fetchImpl).generate(
    API_KEY,
    HISTORY,
    TOOLS,
    "sys",
  );
  assert.deepEqual(
    result.calls.map((c) => c.args),
    [{}, {}],
  );
});

async function kindOf(
  promise: Promise<unknown>,
): Promise<{ kind: ProviderErrorKind; message: string }> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof ProviderError, String(error));
    assert.equal(error.provider, "groq");
    return { kind: error.kind, message: `${error.message} ${error.stack}` };
  }
  assert.fail("expected a ProviderError");
}

const groqError = (status: number, message: string, code?: string) => () =>
  json(status, {
    error: { message, type: "invalid_request_error", code },
  });

const errorCases: [string, () => Response, ProviderErrorKind][] = [
  [
    "401",
    groqError(401, `Invalid API Key ${API_KEY}`, "invalid_api_key"),
    "invalid_key",
  ],
  ["403", groqError(403, "Forbidden"), "invalid_key"],
  [
    "429 rate limit",
    groqError(
      429,
      "Rate limit reached for model on requests per day (RPD)",
      "rate_limit_exceeded",
    ),
    "quota",
  ],
  [
    "429 request too large",
    groqError(
      429,
      "Request too large for model on tokens per minute (TPM): Limit 8000, Requested 9500",
      "rate_limit_exceeded",
    ),
    "too_large",
  ],
  [
    "413",
    groqError(
      413,
      "Request too large for model on tokens per minute (TPM)",
      "rate_limit_exceeded",
    ),
    "too_large",
  ],
  ["400", groqError(400, "bad", "tool_use_failed"), "bad_request"],
  ["500", groqError(500, "internal"), "unavailable"],
  ["503", () => new Response("down", { status: 503 }), "unavailable"],
  ["200 without choices", () => json(200, { choices: [] }), "unavailable"],
];

for (const [label, respond, expected] of errorCases) {
  test(`generate maps ${label} to ${expected} without leaking the key`, async () => {
    const { fetchImpl } = fakeFetch(respond);
    const { kind, message } = await kindOf(
      createGroqClient(fetchImpl).generate(API_KEY, HISTORY, TOOLS, "sys"),
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
    createGroqClient(fetchImpl).generate(API_KEY, HISTORY, TOOLS, "sys"),
  );
  assert.equal(kind, "unavailable");
  assert.ok(!message.includes(API_KEY));
});

test("verifyKey lists the models with the key as a bearer token", async () => {
  const { calls, fetchImpl } = fakeFetch(() => json(200, { data: [] }));
  await createGroqClient(fetchImpl).verifyKey(API_KEY);
  const [{ url, init }] = calls;
  assert.equal(url, "https://api.groq.com/openai/v1/models");
  assert.equal(init.method, "GET");
  assert.equal(
    new Headers(init.headers).get("authorization"),
    `Bearer ${API_KEY}`,
  );
});

const verifyCases: [number, ProviderErrorKind][] = [
  [401, "invalid_key"],
  [403, "invalid_key"],
  [429, "quota"],
  [502, "unavailable"],
];

for (const [status, expected] of verifyCases) {
  test(`verifyKey maps ${status} to ${expected}`, async () => {
    const { fetchImpl } = fakeFetch(groqError(status, `nope ${API_KEY}`));
    const { kind, message } = await kindOf(
      createGroqClient(fetchImpl).verifyKey(API_KEY),
    );
    assert.equal(kind, expected);
    assert.ok(!message.includes(API_KEY));
  });
}
