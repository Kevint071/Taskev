/**
 * Minimal client for the Gemini Interactions API, used statelessly
 * (`store: false`): the caller keeps the history and resends it every turn.
 * Nothing outside this module knows the endpoint or the wire format.
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

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Stable Flash model with a free tier, built for multi-step tool use. Pinned
 * so a model change is a one-line, reviewed edit.
 */
export const GEMINI_MODEL = "gemini-3.7-flash";
export const GEMINI_LABEL = "Gemini 3.7 Flash";

/** Wire schema revision used by the official REST examples. */
const API_REVISION = "2026-05-20";

export function createGeminiClient(
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
          "Api-Revision": API_REVISION,
          "x-goog-api-key": apiKey,
        },
      });
    } catch (error) {
      // Network and TLS failures (e.g. a proxy without its CA) land here. Only
      // the error code is kept: the message may echo request details.
      throw new ProviderError(
        "gemini",
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
      const response = await request(apiKey, "/interactions", {
        method: "POST",
        body: JSON.stringify({
          model: GEMINI_MODEL,
          store: false,
          input: history.map(toWire),
          tools,
          system_instruction: system,
        }),
      });
      if (!response.ok) throw await errorFor(response);

      const body = (await response.json().catch(() => null)) as {
        status?: string;
        steps?: HistoryStep[];
      } | null;
      if (!body || body.status === "failed" || !Array.isArray(body.steps)) {
        throw new ProviderError("gemini", "unavailable");
      }
      return parseSteps(body.steps);
    },

    /** Cheapest authenticated call: resolves only if Gemini accepts the key. */
    async verifyKey(apiKey: string): Promise<void> {
      const response = await request(apiKey, "/models?pageSize=1", {
        method: "GET",
      });
      if (response.ok) return;
      // Any 400 here can only be about the key: the request has no body.
      if (response.status === 400) {
        throw new ProviderError("gemini", "invalid_key", 400);
      }
      throw await errorFor(response);
    },
  };
}

export const gemini = createGeminiClient();

/** The provider tag is ours; the API only knows its own step fields. */
function toWire({ provider: _provider, ...step }: HistoryStep): HistoryStep {
  return step;
}

function parseSteps(steps: HistoryStep[]): GenerateResult {
  const text: string[] = [];
  const calls: FunctionCall[] = [];
  for (const step of steps) {
    if (step.type === "model_output" && Array.isArray(step.content)) {
      for (const part of step.content as { type?: string; text?: unknown }[]) {
        if (part.type === "text" && typeof part.text === "string") {
          text.push(part.text);
        }
      }
    } else if (step.type === "function_call") {
      calls.push({
        id: String(step.id),
        name: String(step.name),
        args: isRecord(step.arguments) ? step.arguments : {},
      });
    }
  }
  return {
    steps: steps.map((step) => ({ ...step, provider: "gemini" })),
    text: text.join(""),
    calls,
  };
}

async function errorFor(response: Response): Promise<ProviderError> {
  const { status } = response;
  if (status === 401 || status === 403) {
    return new ProviderError("gemini", "invalid_key", status);
  }
  if (status === 429) return new ProviderError("gemini", "quota", status);
  if (status === 400) {
    const body = await response.text().catch(() => "");
    return new ProviderError(
      "gemini",
      /API_KEY_INVALID|API key not valid/.test(body)
        ? "invalid_key"
        : "bad_request",
      status,
    );
  }
  return new ProviderError(
    "gemini",
    status >= 500 ? "unavailable" : "bad_request",
    status,
  );
}
