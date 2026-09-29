/**
 * Groq's OpenAI-compatible Chat Completions API; the wire format lives in
 * openai-compatible.ts.
 */
import {
  createOpenAiCompatibleClient,
  type OpenAiCompatibleConfig,
} from "./openai-compatible";
import type { ProviderClient } from "./provider";

/** Open-weight GPT model on Groq, the most reliable of the two at tool use. */
export const GROQ_MODEL = "openai/gpt-oss-120b";

const CONFIG: OpenAiCompatibleConfig = {
  provider: "groq",
  baseUrl: "https://api.groq.com/openai/v1",
  model: GROQ_MODEL,
  // Listing the models needs the key, so a 401 here means it was rejected.
  verifyPath: "/models",
  reasoningEffort: "medium",
};

export function createGroqClient(
  fetchImpl: typeof fetch = fetch,
): ProviderClient {
  return createOpenAiCompatibleClient(CONFIG, fetchImpl);
}

export const groq = createGroqClient();
