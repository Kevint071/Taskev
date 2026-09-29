/**
 * What every model provider shares: the provider-neutral history the agent
 * works on, the tool declarations, the result of one model step and the
 * errors. Each client (gemini.ts, groq.ts, openrouter.ts, copilot.ts)
 * translates to its own wire format.
 */

export const PROVIDERS = ["gemini", "groq", "openrouter", "copilot"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_NAMES: Record<Provider, string> = {
  gemini: "Gemini",
  groq: "Groq",
  openrouter: "OpenRouter",
  copilot: "GitHub Copilot",
};

export function isProvider(value: unknown): value is Provider {
  return PROVIDERS.includes(value as Provider);
}

/**
 * A history step: `user_input`, `model_output`, `function_call`,
 * `function_result`, or a step private to one provider (e.g. Gemini's
 * `thought`). Steps a model produced carry the `provider` that produced them.
 */
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
  /** Model steps, tagged with their provider, to append to the history. */
  steps: HistoryStep[];
  /** Text of the model output, empty when it only called functions. */
  text: string;
  calls: FunctionCall[];
};

/** The wire format a model speaks, when the caller already knows it. */
export type ModelApi = "chat" | "responses";

export type GenerateOptions = { api?: ModelApi };

export type ProviderClient = {
  generate(
    apiKey: string,
    history: HistoryStep[],
    tools: readonly FunctionDeclaration[],
    system: string,
    /** One of the provider's models; its default when omitted. */
    model?: string,
    options?: GenerateOptions,
  ): Promise<GenerateResult>;
  /** Resolves only if the provider accepts the key. */
  verifyKey(apiKey: string): Promise<void>;
};

export type ProviderErrorKind =
  | "invalid_key"
  | "quota"
  | "too_large"
  | "unavailable"
  | "model_unavailable"
  | "bad_request";

/** Its message never contains the key or the provider's response body. */
export class ProviderError extends Error {
  constructor(
    readonly provider: Provider,
    readonly kind: ProviderErrorKind,
    readonly status?: number,
    /** Short code for logs (e.g. ECONNRESET, tool_use_failed); never the provider's message or request data. */
    readonly reason?: string,
  ) {
    super(
      `${PROVIDER_NAMES[provider]} request failed: ${kind}${status ? ` (${status})` : ""}`,
    );
    this.name = "ProviderError";
  }
}

export function networkCode(error: unknown): string {
  const cause = (error as { cause?: { code?: unknown } } | null)?.cause;
  if (typeof cause?.code === "string") return cause.code;
  return error instanceof Error ? error.name : "unknown";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
