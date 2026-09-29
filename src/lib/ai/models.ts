/**
 * The models each provider offers. Providers are separate even when they
 * serve the same model (Groq and OpenRouter both run gpt-oss-120b): a model
 * only exists under the provider that lists it, behind that provider's key.
 * Copilot's list depends on the user's plan, so it's fetched (see copilot.ts).
 */
import { COPILOT_MODEL } from "./copilot";
import { GEMINI_MODEL } from "./gemini";
import { GROQ_MODEL } from "./groq";
import { OPENROUTER_MODEL } from "./openrouter";
import type { ModelApi, Provider } from "./provider";

/** `api` is only known for fetched catalogs (Copilot). */
export type ModelOption = { id: string; label: string; api?: ModelApi };

const FIXED_MODELS: Partial<Record<Provider, ModelOption[]>> = {
  gemini: [{ id: GEMINI_MODEL, label: "Gemini 3.8 Flash" }],
  groq: [{ id: GROQ_MODEL, label: "GPT-OSS 120B" }],
  openrouter: [{ id: OPENROUTER_MODEL, label: "GPT-OSS 120B" }],
};

const DEFAULT_MODELS: Record<Provider, string> = {
  gemini: GEMINI_MODEL,
  groq: GROQ_MODEL,
  openrouter: OPENROUTER_MODEL,
  copilot: COPILOT_MODEL,
};

/** Ids the fetched catalogs may contain: letters, digits and `. _ : / -`. */
const MODEL_ID = /^[\w.:/-]{1,100}$/;

/** The provider's fixed catalog, or null when it has to be fetched. */
export function modelsFor(provider: Provider): ModelOption[] | null {
  return FIXED_MODELS[provider] ?? null;
}

export function defaultModel(provider: Provider): string {
  return DEFAULT_MODELS[provider];
}

/**
 * The model a request asks for, or null if the provider doesn't offer it. A
 * request without one gets the default. A fetched catalog can't be checked
 * here; the provider rejects an id its plan doesn't include.
 */
export function parseModel(provider: Provider, raw: unknown): string | null {
  if (raw === undefined || raw === null) return defaultModel(provider);
  if (typeof raw !== "string" || !MODEL_ID.test(raw)) return null;
  const fixed = modelsFor(provider);
  return fixed && !fixed.some((m) => m.id === raw) ? null : raw;
}
