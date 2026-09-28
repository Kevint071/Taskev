/**
 * Minimal client for Groq's OpenAI-compatible Chat Completions API. The
 * provider-neutral history is rebuilt as chat messages on every request;
 * nothing outside this module knows the endpoint or the wire format.
 */
import {
  type FunctionCall,
  type FunctionDeclaration,
  type GenerateResult,
  type HistoryStep,
  isRecord,
  networkCode,
  type ProviderClient,
  ProviderError,
} from "./provider";

const BASE_URL = "https://api.groq.com/openai/v1";

/** Open-weight GPT model on Groq, the most reliable of the two at tool use. */
export const GROQ_MODEL = "openai/gpt-oss-120b";
export const GROQ_LABEL = "GPT-OSS 120B · Groq";

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

export function createGroqClient(
  fetchImpl: typeof fetch = fetch,
): ProviderClient {
  async function request(
    apiKey: string,
    path: string,
    init: RequestInit,
  ): Promise<Response> {
    try {
      return await fetchImpl(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });
    } catch (error) {
      // Only the error code is kept: the message may echo request details.
      throw new ProviderError(
        "groq",
        "unavailable",
        undefined,
        networkCode(error),
      );
    }
  }

  return {
    async generate(
      apiKey: string,
      history: HistoryStep[],
      tools: readonly FunctionDeclaration[],
      system: string,
    ): Promise<GenerateResult> {
      const response = await request(apiKey, "/chat/completions", {
        method: "POST",
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: system },
            ...toMessages(history),
          ],
          tools: tools.map(({ name, description, parameters }) => ({
            type: "function",
            function: { name, description, parameters },
          })),
          reasoning_effort: "medium",
        }),
      });
      if (!response.ok) throw await errorFor(response);

      const body = (await response.json().catch(() => null)) as {
        choices?: { message?: Record<string, unknown> }[];
      } | null;
      const message = body?.choices?.[0]?.message;
      if (!isRecord(message)) throw new ProviderError("groq", "unavailable");
      return parseMessage(message);
    },

    async verifyKey(apiKey: string): Promise<void> {
      const response = await request(apiKey, "/models", { method: "GET" });
      if (!response.ok) throw await errorFor(response);
    },
  };
}

export const groq = createGroqClient();

function textOf(step: HistoryStep): string {
  if (!Array.isArray(step.content)) return "";
  return (step.content as { type?: string; text?: unknown }[])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
}

function toMessages(history: HistoryStep[]): Message[] {
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
        if (step.provider === "groq" && index > turnStart) {
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

function parseArguments(raw: unknown): Record<string, unknown> {
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

function parseMessage(message: Record<string, unknown>): GenerateResult {
  const steps: HistoryStep[] = [];
  const calls: FunctionCall[] = [];
  const text = typeof message.content === "string" ? message.content : "";

  if (typeof message.reasoning === "string" && message.reasoning) {
    steps.push({
      type: "reasoning",
      text: message.reasoning,
      provider: "groq",
    });
  }
  if (text) {
    steps.push({
      type: "model_output",
      content: [{ type: "text", text }],
      provider: "groq",
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
      provider: "groq",
    });
  }
  return { steps, text, calls };
}

async function errorFor(response: Response): Promise<ProviderError> {
  const { status } = response;
  if (status === 401 || status === 403) {
    return new ProviderError("groq", "invalid_key", status);
  }
  if (status === 413) return new ProviderError("groq", "too_large", status);
  if (status === 429) {
    // Groq reports a request above the tokens-per-minute limit as a 429 too;
    // retrying won't help there, so it gets its own kind.
    const body = await response.text().catch(() => "");
    return new ProviderError(
      "groq",
      /Request too large/i.test(body) ? "too_large" : "quota",
      status,
    );
  }
  return new ProviderError(
    "groq",
    status >= 500 ? "unavailable" : "bad_request",
    status,
  );
}
