/**
 * Minimal client for OpenAI-compatible Chat Completions APIs (Groq,
 * OpenRouter). The provider-neutral history is rebuilt as chat messages on
 * every request; nothing outside this module knows the wire format. Each
 * provider supplies its endpoint, model and verification path in `config`.
 */
import { renderTurnsFor } from "./history";
import {
  type FunctionCall,
  type FunctionDeclaration,
  type GenerateResult,
  type HistoryStep,
  isRecord,
  networkCode,
  type Provider,
  type ProviderClient,
  ProviderError,
} from "./provider";

export type OpenAiCompatibleConfig = {
  provider: Provider;
  /** Without a trailing slash; paths are appended to it. */
  baseUrl: string;
  model: string;
  /** Endpoint verifyKey calls; it must reject an invalid key with 401/403. */
  verifyPath: string;
  /** Headers beyond content type and authorization (e.g. attribution). */
  headers?: Record<string, string>;
  /** Sent as `reasoning_effort`; leave out for models that reject it. */
  reasoningEffort?: string;
};

/** Steps a model produces; consecutive ones form one assistant message. */
const MODEL_STEPS = new Set(["model_output", "function_call", "reasoning"]);

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type Message =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      reasoning?: string;
      tool_calls?: ToolCall[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

/** Authenticated calls to the provider, retried once on a network failure. */
export function createRequest(
  config: OpenAiCompatibleConfig,
  fetchImpl: typeof fetch,
) {
  return async function request(
    apiKey: string,
    path: string,
    init: RequestInit,
  ): Promise<Response> {
    const attempt = () =>
      fetchImpl(`${config.baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...config.headers,
        },
      });
    try {
      // The connection occasionally fails transiently (e.g. behind flaky
      // corporate proxies). One retry avoids surfacing that as a
      // user-facing 503 for what is otherwise a normal request.
      return await attempt().catch(() => attempt());
    } catch (error) {
      // Only the error code is kept: the message may echo request details.
      throw new ProviderError(
        config.provider,
        "unavailable",
        undefined,
        networkCode(error),
      );
    }
  };
}

export function createOpenAiCompatibleClient(
  config: OpenAiCompatibleConfig,
  fetchImpl: typeof fetch = fetch,
): ProviderClient {
  const { provider, model, verifyPath } = config;
  const request = createRequest(config, fetchImpl);

  return {
    async generate(
      apiKey: string,
      history: HistoryStep[],
      tools: readonly FunctionDeclaration[],
      system: string,
      modelId: string = model,
    ): Promise<GenerateResult> {
      const response = await request(apiKey, "/chat/completions", {
        method: "POST",
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: "system", content: system },
            ...toMessages(renderTurnsFor(provider, history), provider),
          ],
          tools: tools.map(({ name, description, parameters }) => ({
            type: "function",
            function: { name, description, parameters },
          })),
          ...(config.reasoningEffort
            ? { reasoning_effort: config.reasoningEffort }
            : {}),
        }),
      });
      if (!response.ok) throw await errorFor(response, provider);

      const body = (await response.json().catch(() => null)) as {
        choices?: { message?: Record<string, unknown> }[];
      } | null;
      const message = body?.choices?.[0]?.message;
      if (!isRecord(message)) throw new ProviderError(provider, "unavailable");
      return parseMessage(message, provider);
    },

    async verifyKey(apiKey: string): Promise<void> {
      const response = await request(apiKey, verifyPath, { method: "GET" });
      if (!response.ok) throw await errorFor(response, provider);
    },
  };
}

export function textOf(step: HistoryStep): string {
  if (!Array.isArray(step.content)) return "";
  return (step.content as { type?: string; text?: unknown }[])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
}

function toMessages(history: HistoryStep[], provider: Provider): Message[] {
  const messages: Message[] = [];
  const turnStart = history.findLastIndex((s) => s.type === "user_input");
  let assistant: Extract<Message, { role: "assistant" }> | null = null;
  const openAssistant = () => {
    if (!assistant) {
      assistant = { role: "assistant", content: null };
      messages.push(assistant);
    }
    return assistant;
  };

  for (const [index, step] of history.entries()) {
    if (!MODEL_STEPS.has(step.type)) assistant = null;
    switch (step.type) {
      case "user_input":
        messages.push({ role: "user", content: textOf(step) });
        break;
      case "function_result":
        messages.push({
          role: "tool",
          tool_call_id: String(step.call_id),
          content: JSON.stringify(step.result ?? {}),
        });
        break;
      case "reasoning":
        // gpt-oss chains tool calls better with its reasoning between them;
        // closed turns leave it out to save tokens.
        if (step.provider === provider && index > turnStart) {
          openAssistant().reasoning = String(step.text);
        }
        break;
      case "model_output":
      case "function_call": {
        const message = openAssistant();
        if (step.type === "model_output") {
          const text = textOf(step);
          if (text) message.content = (message.content ?? "") + text;
        } else {
          message.tool_calls = [
            ...(message.tool_calls ?? []),
            {
              id: String(step.id),
              type: "function",
              function: {
                name: String(step.name),
                arguments: JSON.stringify(step.arguments ?? {}),
              },
            },
          ];
        }
        break;
      }
      // Anything else (e.g. Gemini's thoughts) stays out.
    }
  }
  return messages;
}

export function parseArguments(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    // Malformed arguments reach the tool as {} and fail its validation, which
    // tells the model what was missing.
    return {};
  }
}

function parseMessage(
  message: Record<string, unknown>,
  provider: Provider,
): GenerateResult {
  const steps: HistoryStep[] = [];
  const calls: FunctionCall[] = [];
  const text = typeof message.content === "string" ? message.content : "";

  if (typeof message.reasoning === "string" && message.reasoning) {
    steps.push({ type: "reasoning", text: message.reasoning, provider });
  }
  if (text) {
    steps.push({
      type: "model_output",
      content: [{ type: "text", text }],
      provider,
    });
  }
  const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
  for (const call of toolCalls as {
    id?: unknown;
    function?: { name?: unknown; arguments?: unknown };
  }[]) {
    const parsed = {
      id: String(call.id),
      name: String(call.function?.name),
      args: parseArguments(call.function?.arguments),
    };
    calls.push(parsed);
    steps.push({
      type: "function_call",
      id: parsed.id,
      name: parsed.name,
      arguments: parsed.args,
      provider,
    });
  }
  return { steps, text, calls };
}

export async function errorFor(
  response: Response,
  provider: Provider,
): Promise<ProviderError> {
  const { status } = response;
  if (status === 401 || status === 403) {
    return new ProviderError(provider, "invalid_key", status);
  }
  // OpenRouter answers a credit-less account with 402; Groq never does.
  if (status === 402) return new ProviderError(provider, "quota", status);
  if (status === 413) return new ProviderError(provider, "too_large", status);
  if (status === 429) {
    // Groq reports a request above the tokens-per-minute limit as a 429 too;
    // retrying won't help there, so it gets its own kind.
    const body = await response.text().catch(() => "");
    return new ProviderError(
      provider,
      /Request too large/i.test(body) ? "too_large" : "quota",
      status,
    );
  }
  if (status >= 500) return new ProviderError(provider, "unavailable", status);
  // The message can echo request content back (e.g. tool_use_failed quotes
  // the model's own attempt), so only its short error code reaches the logs.
  const body = (await response.json().catch(() => null)) as {
    error?: { code?: unknown };
  } | null;
  const code = body?.error?.code;
  if (code === "model_not_supported" || code === "model_not_found") {
    return new ProviderError(provider, "model_unavailable", status, code);
  }
  return new ProviderError(
    provider,
    "bad_request",
    status,
    typeof code === "string" ? code : undefined,
  );
}
