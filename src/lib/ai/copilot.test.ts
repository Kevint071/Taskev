import assert from "node:assert/strict";
import { test } from "node:test";
import { COPILOT_MODEL, createCopilotClient } from "./copilot";
import { type HistoryStep, ProviderError } from "./provider";

const API_KEY = "gho_TEST-secret-token-1234";

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

function fakeFetch(
  respond: () => Response | Promise<Response>,
  respondTo?: (url: string) => Response | Promise<Response>,
) {
  const calls: Call[] = [];
  const fetchImpl = async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    calls.push({ url: String(input), init: init ?? {} });
    return respondTo ? respondTo(String(input)) : respond();
  };
  return { calls, fetchImpl: fetchImpl as typeof fetch };
}

function callTo(calls: Call[], path: string) {
  const call = calls.find((c) => c.url.endsWith(path));
  assert.ok(call, `no request to ${path}`);
  return call;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const TEXT_RESPONSE = {
  choices: [{ message: { role: "assistant", content: "Hola." } }],
};

test("generate posts to the Copilot API with the integration id header", async () => {
  const { calls, fetchImpl } = fakeFetch(() => json(200, TEXT_RESPONSE));
  await createCopilotClient(fetchImpl).generate(API_KEY, HISTORY, TOOLS, "sys");

  const { url, init } = callTo(calls, "/chat/completions");
  assert.equal(url, "https://api.githubcopilot.com/chat/completions");
  const headers = new Headers(init.headers);
  assert.equal(headers.get("authorization"), `Bearer ${API_KEY}`);
  assert.equal(headers.get("copilot-integration-id"), "copilot-developer-cli");
  const body = JSON.parse(String(init.body));
  assert.equal(body.model, COPILOT_MODEL);
  // Copilot models such as gpt-4o don't take a reasoning effort.
  assert.equal("reasoning_effort" in body, false);
});

test("generate uses the model it is given", async () => {
  const { calls, fetchImpl } = fakeFetch(() => json(200, TEXT_RESPONSE));
  await createCopilotClient(fetchImpl).generate(
    API_KEY,
    HISTORY,
    TOOLS,
    "sys",
    "claude-sonnet-4",
  );
  assert.equal(
    JSON.parse(String(callTo(calls, "/chat/completions").init.body)).model,
    "claude-sonnet-4",
  );
});

test("generate tags the steps as copilot's", async () => {
  const { fetchImpl } = fakeFetch(() => json(200, TEXT_RESPONSE));
  const { steps } = await createCopilotClient(fetchImpl).generate(
    API_KEY,
    HISTORY,
    TOOLS,
    "sys",
  );
  assert.deepEqual(
    steps.map((step) => [step.type, step.provider]),
    [["model_output", "copilot"]],
  );
});

test("generate reports a model the plan doesn't include", async () => {
  const { fetchImpl } = fakeFetch(() =>
    json(400, {
      error: { message: "no", code: "model_not_supported" },
    }),
  );
  await assert.rejects(
    createCopilotClient(fetchImpl).generate(API_KEY, HISTORY, TOOLS, "sys"),
    (error) =>
      error instanceof ProviderError && error.kind === "model_unavailable",
  );
});

test("verifyKey rejects a token Copilot refuses", async () => {
  const { fetchImpl } = fakeFetch(() => json(401, { error: "unauthorized" }));
  await assert.rejects(
    createCopilotClient(fetchImpl).verifyKey(API_KEY),
    (error) => error instanceof ProviderError && error.kind === "invalid_key",
  );
});

test("listModels keeps chat models with tool calls that the picker offers", async () => {
  const { calls, fetchImpl } = fakeFetch(() =>
    json(200, {
      data: [
        {
          id: "gpt-4o",
          name: "GPT-4o",
          model_picker_enabled: true,
          capabilities: { type: "chat", supports: { tool_calls: true } },
          supported_endpoints: ["/chat/completions"],
        },
        {
          id: "text-embedding-3-small",
          name: "Embedding",
          model_picker_enabled: false,
          capabilities: { type: "embeddings" },
        },
        {
          id: "gpt-5-codex",
          name: "GPT-5 Codex",
          model_picker_enabled: true,
          capabilities: { type: "chat", supports: { tool_calls: true } },
          supported_endpoints: ["/responses", "ws:/responses"],
        },
        {
          id: "messages-only",
          name: "Messages only",
          model_picker_enabled: true,
          capabilities: { type: "chat", supports: { tool_calls: true } },
          supported_endpoints: ["/v1/messages"],
        },
        {
          id: "no-tools",
          name: "No tools",
          model_picker_enabled: true,
          capabilities: { type: "chat", supports: { tool_calls: false } },
        },
        {
          id: "gpt-4o",
          name: "GPT-4o (duplicate)",
          model_picker_enabled: true,
          capabilities: { type: "chat" },
        },
        { id: "claude-sonnet-4", capabilities: { type: "chat" } },
      ],
    }),
  );
  const models = await createCopilotClient(fetchImpl).listModels(API_KEY);

  assert.equal(calls[0].url, "https://api.githubcopilot.com/models");
  assert.equal(
    new Headers(calls[0].init.headers).get("copilot-integration-id"),
    "copilot-developer-cli",
  );
  assert.deepEqual(models, [
    { id: "gpt-4o", label: "GPT-4o", api: "chat" },
    { id: "gpt-5-codex", label: "GPT-5 Codex", api: "responses" },
    { id: "claude-sonnet-4", label: "claude-sonnet-4", api: "chat" },
  ]);
});

test("listModels fails with the provider error kind", async () => {
  const { fetchImpl } = fakeFetch(() => json(403, {}));
  await assert.rejects(
    createCopilotClient(fetchImpl).listModels(API_KEY),
    (error) => error instanceof ProviderError && error.kind === "invalid_key",
  );
});

const CATALOG = {
  data: [
    {
      id: "gpt-6-sol",
      name: "GPT-6 Sol",
      model_picker_enabled: true,
      capabilities: { type: "chat", supports: { tool_calls: true } },
      supported_endpoints: ["/responses", "ws:/responses"],
    },
    {
      id: "claude-sonnet-5",
      name: "Claude Sonnet 5",
      model_picker_enabled: true,
      capabilities: { type: "chat", supports: { tool_calls: true } },
      supported_endpoints: ["/v1/messages", "/chat/completions"],
    },
  ],
};

const RESPONSES_TEXT = {
  output: [
    { type: "reasoning", id: "rs_1", summary: [] },
    {
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: "Tienes 2 tareas." }],
    },
  ],
};

function routed(responsesBody: unknown) {
  return fakeFetch(
    () => {
      throw new Error("unrouted");
    },
    (url) =>
      url.endsWith("/models") ? json(200, CATALOG) : json(200, responsesBody),
  );
}

test("a model that only speaks /responses goes to the Responses API", async () => {
  const { calls, fetchImpl } = routed(RESPONSES_TEXT);
  const result = await createCopilotClient(fetchImpl).generate(
    API_KEY,
    HISTORY,
    TOOLS,
    "sys",
    "gpt-6-sol",
  );

  assert.equal(
    calls.some((c) => c.url.endsWith("/chat/completions")),
    false,
  );
  const { init } = callTo(calls, "/responses");
  const headers = new Headers(init.headers);
  assert.equal(headers.get("authorization"), `Bearer ${API_KEY}`);
  assert.equal(headers.get("copilot-integration-id"), "copilot-developer-cli");
  const body = JSON.parse(String(init.body));
  assert.equal(body.model, "gpt-6-sol");
  assert.equal(body.instructions, "sys");
  assert.equal(body.store, false);
  assert.deepEqual(body.input, [
    { role: "user", content: [{ type: "input_text", text: "hola" }] },
  ]);
  assert.deepEqual(body.tools, [
    {
      type: "function",
      name: "list_tasks",
      description: "Lists tasks",
      parameters: { type: "object", properties: {} },
      strict: false,
    },
  ]);
  assert.equal(result.text, "Tienes 2 tareas.");
  assert.deepEqual(
    result.steps.map((s) => [s.type, s.provider]),
    [["model_output", "copilot"]],
  );
});

test("a model that speaks /chat/completions stays there", async () => {
  const { calls, fetchImpl } = routed(TEXT_RESPONSE);
  await createCopilotClient(fetchImpl).generate(
    API_KEY,
    HISTORY,
    TOOLS,
    "sys",
    "claude-sonnet-5",
  );
  assert.equal(
    calls.some((c) => c.url.endsWith("/responses")),
    false,
  );
  callTo(calls, "/chat/completions");
});

test("Responses function calls become calls and their results go back", async () => {
  const { calls, fetchImpl } = routed({
    output: [
      {
        type: "function_call",
        id: "fc_1",
        call_id: "call_1",
        name: "list_tasks",
        arguments: '{"status":"bloqueada"}',
      },
    ],
  });
  const client = createCopilotClient(fetchImpl);
  const first = await client.generate(
    API_KEY,
    HISTORY,
    TOOLS,
    "sys",
    "gpt-6-sol",
  );

  assert.deepEqual(first.calls, [
    { id: "call_1", name: "list_tasks", args: { status: "bloqueada" } },
  ]);
  assert.deepEqual(
    first.steps.map((s) => [s.type, s.provider, s.id]),
    [["function_call", "copilot", "call_1"]],
  );

  await client.generate(
    API_KEY,
    [
      ...HISTORY,
      ...first.steps,
      {
        type: "function_result",
        call_id: "call_1",
        name: "list_tasks",
        result: { tasks: [] },
      },
    ],
    TOOLS,
    "sys",
    "gpt-6-sol",
  );
  const sent = calls.filter((c) => c.url.endsWith("/responses")).at(-1);
  assert.deepEqual(JSON.parse(String(sent?.init.body)).input.slice(1), [
    {
      type: "function_call",
      call_id: "call_1",
      name: "list_tasks",
      arguments: '{"status":"bloqueada"}',
    },
    {
      type: "function_call_output",
      call_id: "call_1",
      output: '{"tasks":[]}',
    },
  ]);
});

test("Responses errors map like the other endpoint's", async () => {
  const { fetchImpl } = fakeFetch(
    () => json(500, {}),
    (url) =>
      url.endsWith("/models")
        ? json(200, CATALOG)
        : json(400, {
            error: { code: "model_not_supported" },
          }),
  );
  await assert.rejects(
    createCopilotClient(fetchImpl).generate(
      API_KEY,
      HISTORY,
      TOOLS,
      "sys",
      "gpt-6-sol",
    ),
    (error) =>
      error instanceof ProviderError && error.kind === "model_unavailable",
  );
});

test("a failed catalog lookup still reaches /responses when chat refuses the model", async () => {
  const { calls, fetchImpl } = fakeFetch(
    () => json(500, {}),
    (url) => {
      if (url.endsWith("/models")) throw new TypeError("fetch failed");
      if (url.endsWith("/chat/completions")) {
        return json(400, { error: { code: "unsupported_api_for_model" } });
      }
      return json(200, RESPONSES_TEXT);
    },
  );
  const result = await createCopilotClient(fetchImpl).generate(
    API_KEY,
    HISTORY,
    TOOLS,
    "sys",
    "gpt-6-luna",
  );
  assert.equal(result.text, "Tienes 2 tareas.");
  callTo(calls, "/responses");
});

test("the catalog lookup is retried once after a network failure", async () => {
  let attempts = 0;
  const { calls, fetchImpl } = fakeFetch(
    () => json(500, {}),
    (url) => {
      if (url.endsWith("/models")) {
        if (attempts++ === 0) throw new TypeError("fetch failed");
        return json(200, CATALOG);
      }
      return json(200, RESPONSES_TEXT);
    },
  );
  await createCopilotClient(fetchImpl).generate(
    API_KEY,
    HISTORY,
    TOOLS,
    "sys",
    "gpt-6-sol",
  );
  assert.equal(
    calls.some((c) => c.url.endsWith("/chat/completions")),
    false,
  );
});

test("the catalog loaded for the model picker also routes the next requests", async () => {
  const { calls, fetchImpl } = routed(RESPONSES_TEXT);
  const client = createCopilotClient(fetchImpl);
  await client.listModels(API_KEY);
  await client.generate(API_KEY, HISTORY, TOOLS, "sys", "gpt-6-sol");

  assert.equal(calls.filter((c) => c.url.endsWith("/models")).length, 1);
  callTo(calls, "/responses");
});

test("an endpoint hint routes the request without looking at the catalog", async () => {
  for (const [api, path] of [
    ["responses", "/responses"],
    ["chat", "/chat/completions"],
  ] as const) {
    const { calls, fetchImpl } = fakeFetch(
      () => json(500, {}),
      (url) =>
        url.endsWith("/responses")
          ? json(200, RESPONSES_TEXT)
          : json(200, TEXT_RESPONSE),
    );
    await createCopilotClient(fetchImpl).generate(
      API_KEY,
      HISTORY,
      TOOLS,
      "sys",
      "some-model",
      { api },
    );
    assert.equal(calls.length, 1, api);
    assert.ok(calls[0].url.endsWith(path), api);
  }
});

test("a wrong endpoint hint is corrected when Copilot refuses the model", async () => {
  const { calls, fetchImpl } = fakeFetch(
    () => json(500, {}),
    (url) =>
      url.endsWith("/chat/completions")
        ? json(400, { error: { code: "unsupported_api_for_model" } })
        : json(200, RESPONSES_TEXT),
  );
  const result = await createCopilotClient(fetchImpl).generate(
    API_KEY,
    HISTORY,
    TOOLS,
    "sys",
    "gpt-6-sol",
    { api: "chat" },
  );
  assert.equal(result.text, "Tienes 2 tareas.");
  callTo(calls, "/responses");
});

test("listModels tells each model's endpoint", async () => {
  const { fetchImpl } = fakeFetch(() => json(200, CATALOG));
  const models = await createCopilotClient(fetchImpl).listModels(API_KEY);
  assert.deepEqual(
    models.map((m) => [m.id, m.api]),
    [
      ["gpt-6-sol", "responses"],
      ["claude-sonnet-5", "chat"],
    ],
  );
});
