/**
 * GitHub Copilot's OpenAI-compatible API. Copilot has no API keys of its own:
 * the "key" is a GitHub token that api.githubcopilot.com accepts (an OAuth
 * token, or a fine-grained PAT with the Copilot Requests permission). Requests
 * count against the user's Copilot allowance.
 *
 * Each model speaks one of two wire formats, which the catalog reports as
 * `supported_endpoints`: Chat Completions (Claude, Gemini, GPT 5.4) or
 * Responses (GPT 5.5+, Grok, Codex). The formats live in openai-compatible.ts
 * and openai-responses.ts; this module picks one per model.
 */
import {
  createOpenAiCompatibleClient,
  createRequest,
  type OpenAiCompatibleConfig,
} from "./openai-compatible";
import { createResponsesGenerate } from "./openai-responses";
import {
  isRecord,
  type ModelApi,
  type ProviderClient,
  ProviderError,
} from "./provider";

/** Fallback while the plan's list loads; the API rejects it if not included. */
export const COPILOT_MODEL = "gpt-4o";

const BASE_URL = "https://api.githubcopilot.com";

/**
 * Accepted for OAuth tokens and PATs alike (`vscode-chat` is refused for
 * PATs). The model list also depends on it: without it, fewer are returned.
 */
const INTEGRATION_ID = "copilot-developer-cli";

const CONFIG: OpenAiCompatibleConfig = {
  provider: "copilot",
  baseUrl: BASE_URL,
  model: COPILOT_MODEL,
  // The models the token can use; a 401/403 here means it was rejected.
  verifyPath: "/models",
  headers: { "Copilot-Integration-Id": INTEGRATION_ID },
  // gpt-4o and friends reject reasoning_effort, so it's left out.
};

const CHAT = "/chat/completions";
const RESPONSES = "/responses";

/** How long a token's catalog is reused to route requests. */
const CATALOG_TTL_MS = 10 * 60 * 1000;
const CATALOG_MAX_TOKENS = 50;

export type CopilotModel = {
  id: string;
  label: string;
  /** The wire format to use; Chat Completions when the catalog doesn't say. */
  api: ModelApi;
};

export type CopilotClient = ProviderClient & {
  /** The chat models with tool calling that the user's plan includes. */
  listModels(apiKey: string): Promise<CopilotModel[]>;
};

export function createCopilotClient(
  fetchImpl: typeof fetch = fetch,
): CopilotClient {
  const chat = createOpenAiCompatibleClient(CONFIG, fetchImpl);
  const request = createRequest(CONFIG, fetchImpl);
  const generateResponses = createResponsesGenerate(CONFIG, request);
  const catalogs = new Map<string, { at: number; models: CopilotModel[] }>();

  async function listModels(apiKey: string): Promise<CopilotModel[]> {
    // Through `request`, so a transient connection failure is retried.
    const response = await request(apiKey, "/models", { method: "GET" });
    const { status } = response;
    if (!response.ok) {
      throw new ProviderError(
        "copilot",
        status === 401 || status === 403
          ? "invalid_key"
          : status === 429
            ? "quota"
            : "unavailable",
        status,
      );
    }
    const models = parseModels(await response.json().catch(() => null));
    // Loading the picker's list leaves the catalog ready for the requests
    // that follow, so they don't depend on a second lookup.
    if (catalogs.size >= CATALOG_MAX_TOKENS) catalogs.clear();
    catalogs.set(apiKey, { at: Date.now(), models });
    return models;
  }

  /** The model's format per the catalog, which is fetched if not held. */
  async function apiFor(apiKey: string, model: string): Promise<ModelApi> {
    let models = catalogs.get(apiKey)?.models;
    if (
      !models ||
      Date.now() - (catalogs.get(apiKey)?.at ?? 0) > CATALOG_TTL_MS
    ) {
      try {
        models = await listModels(apiKey);
      } catch {
        // Without the catalog the request goes out as chat; its own error
        // (bad token, no such model) is the one worth reporting.
        return "chat";
      }
    }
    return models.find((m) => m.id === model)?.api ?? "chat";
  }

  return {
    ...chat,

    async generate(
      apiKey,
      history,
      tools,
      system,
      model = COPILOT_MODEL,
      options,
    ) {
      // The caller's hint (what the model picker's catalog said) spares a
      // lookup, which on serverless would often start from an empty cache.
      const api = options?.api ?? (await apiFor(apiKey, model));
      const [first, other] =
        api === "responses"
          ? [generateResponses, chat.generate]
          : [chat.generate, generateResponses];
      try {
        return await first(apiKey, history, tools, system, model);
      } catch (error) {
        // A hint or the catalog can be stale; Copilot itself says when a model
        // belongs to the other endpoint.
        if (
          error instanceof ProviderError &&
          error.reason === "unsupported_api_for_model"
        ) {
          return other(apiKey, history, tools, system, model);
        }
        throw error;
      }
    },

    listModels,
  };
}

export const copilot = createCopilotClient();

/** Only what the assistant can use: chat with tools over either endpoint. */
function parseModels(body: unknown): CopilotModel[] {
  const data = isRecord(body) && Array.isArray(body.data) ? body.data : [];
  const models: CopilotModel[] = [];
  const seen = new Set<string>();

  for (const entry of data) {
    if (!isRecord(entry) || typeof entry.id !== "string") continue;
    if (seen.has(entry.id)) continue;
    const capabilities = isRecord(entry.capabilities) ? entry.capabilities : {};
    const supports = isRecord(capabilities.supports)
      ? capabilities.supports
      : {};
    const endpoints = Array.isArray(entry.supported_endpoints)
      ? entry.supported_endpoints.filter((e) => typeof e === "string")
      : undefined;

    if (entry.model_picker_enabled === false) continue;
    if (capabilities.type !== undefined && capabilities.type !== "chat")
      continue;
    if (supports.tool_calls === false) continue;
    if (
      endpoints &&
      !endpoints.includes(CHAT) &&
      !endpoints.includes(RESPONSES)
    ) {
      continue;
    }

    seen.add(entry.id);
    models.push({
      id: entry.id,
      label:
        typeof entry.name === "string" && entry.name ? entry.name : entry.id,
      api:
        endpoints && !endpoints.includes(CHAT) && endpoints.includes(RESPONSES)
          ? "responses"
          : "chat",
    });
  }
  return models;
}
