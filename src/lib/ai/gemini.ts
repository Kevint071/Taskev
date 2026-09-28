/**
 * Minimal client for the Gemini Interactions API, used statelessly
 * (`store: false`): the caller keeps the history and resends it every turn.
 * Nothing outside this module knows the endpoint or the wire format beyond
 * the opaque history steps.
 */

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Stable Flash model with a free tier, built for multi-step tool use. Pinned
 * so a model change is a one-line, reviewed edit.
 */
export const GEMINI_MODEL = "gemini-3.8-flash";

/** Wire schema revision used by the official REST examples. */
const API_REVISION = "2026-05-20";

/** A step as the API sends or expects it; kept verbatim in the history. */
export type HistoryStep = { type: string; [field: string]: unknown };

export type FunctionDeclaration = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type FunctionCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

export type GenerateResult = {
  /** Model steps (thoughts included) to append to the history as-is. */
  steps: HistoryStep[];
  /** Text of the model output, empty when it only called functions. */
  text: string;
  calls: FunctionCall[];
};

export type GeminiErrorKind =
  | "invalid_key"
  | "quota"
  | "unavailable"
  | "bad_request";

/** Its message never contains the key or the provider's response body. */
export class GeminiError extends Error {
  constructor(
    readonly kind: GeminiErrorKind,
    readonly status?: number,
  ) {
    super(`Gemini request failed: ${kind}${status ? ` (${status})` : ""}`);
    this.name = "GeminiError";
  }
}

export type GeminiClient = ReturnType<typeof createGeminiClient>;

export function createGeminiClient(fetchImpl: typeof fetch = fetch) {
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
    } catch {
      // Network and TLS failures (e.g. a proxy without its CA) land here; the
      // original error is dropped because it may echo request details.
      throw new GeminiError("unavailable");
    }
  }

  return {
    async generate(
      apiKey: string,
      history: HistoryStep[],
      tools: FunctionDeclaration[],
      system: string,
    ): Promise<GenerateResult> {
      const response = await request(apiKey, "/interactions", {
        method: "POST",
        body: JSON.stringify({
          model: GEMINI_MODEL,
          store: false,
          input: history,
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
        throw new GeminiError("unavailable");
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
        throw new GeminiError("invalid_key", 400);
      }
      throw await errorFor(response);
    },
  };
}

export const gemini = createGeminiClient();

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
  return { steps, text: text.join(""), calls };
}

async function errorFor(response: Response): Promise<GeminiError> {
  const { status } = response;
  if (status === 401 || status === 403) {
    return new GeminiError("invalid_key", status);
  }
  if (status === 429) return new GeminiError("quota", status);
  if (status === 400) {
    const body = await response.text().catch(() => "");
    return new GeminiError(
      /API_KEY_INVALID|API key not valid/.test(body)
        ? "invalid_key"
        : "bad_request",
      status,
    );
  }
  return new GeminiError(status >= 500 ? "unavailable" : "bad_request", status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
