import type { Provider } from "@/lib/ai/provider";

export type KeyStatus = { configured: boolean; last4?: string };

export const KEY_PROVIDERS: Record<
  Provider,
  {
    endpoint: string;
    consoleName: string;
    consoleUrl: string;
    /** False when the provider charges per use, so the copy omits "gratis". */
    free: boolean;
  }
> = {
  gemini: {
    endpoint: "/api/account/gemini-key",
    consoleName: "Google AI Studio",
    consoleUrl: "https://aistudio.google.com/apikey",
    free: true,
  },
  groq: {
    endpoint: "/api/account/groq-key",
    consoleName: "GroqCloud",
    consoleUrl: "https://console.groq.com/keys",
    free: true,
  },
  openrouter: {
    endpoint: "/api/account/openrouter-key",
    consoleName: "OpenRouter",
    consoleUrl: "https://openrouter.ai/settings/keys",
    free: false,
  },
  copilot: {
    endpoint: "/api/account/copilot-key",
    consoleName: "GitHub (permiso «Copilot Requests»)",
    consoleUrl: "https://github.com/settings/personal-access-tokens/new",
    free: false,
  },
};
