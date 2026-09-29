/**
 * OpenRouter's OpenAI-compatible Chat Completions API; the wire format lives
 * in openai-compatible.ts.
 */
import {
  createOpenAiCompatibleClient,
  type OpenAiCompatibleConfig,
} from "./openai-compatible";
import type { ProviderClient } from "./provider";

/**
 * Same open-weight GPT model as Groq (see GROQ_MODEL), routed by OpenRouter:
 * it supports tools and `reasoning_effort` there too. Keep MODEL_LABELS in
 * step when changing it.
 */
export const OPENROUTER_MODEL = "openai/gpt-oss-120b";

const CONFIG: OpenAiCompatibleConfig = {
  provider: "openrouter",
  baseUrl: "https://openrouter.ai/api/v1",
  model: OPENROUTER_MODEL,
  // /models is public, so it would accept any key; /key needs a valid one.
  verifyPath: "/key",
  // Optional attribution OpenRouter shows on the account's activity page.
  headers: { "X-Title": "Taskev" },
};

export function createOpenRouterClient(
  fetchImpl: typeof fetch = fetch,
): ProviderClient {
  return createOpenAiCompatibleClient(CONFIG, fetchImpl);
}

export const openrouter = createOpenRouterClient();
