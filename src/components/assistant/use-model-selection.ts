import { useEffect, useState } from "react";
import { defaultModel, type ModelOption, modelsFor } from "@/lib/ai/models";
import type { Provider } from "@/lib/ai/provider";
import { handleUnauthenticated } from "@/lib/api-client";

/** Remembers, per browser, the model last picked under each provider. */
const MODELS_STORAGE_KEY = "taskev.assistant.models";

/** Copilot's models depend on the user's plan, so they're fetched once. */
type CopilotModels =
  | { status: "idle" | "loading" | "error"; options: ModelOption[] }
  | { status: "ready"; options: ModelOption[] };

function initialModels(): Record<Provider, string> {
  return {
    gemini: defaultModel("gemini"),
    groq: defaultModel("groq"),
    openrouter: defaultModel("openrouter"),
    copilot: defaultModel("copilot"),
  };
}

export type ModelSelection = ReturnType<typeof useModelSelection>;

/** The model picked under each provider, and the catalog the picker offers. */
export function useModelSelection(provider: Provider, providers: Provider[]) {
  // Each provider keeps its own model, so one model id offered by two
  // providers is never mixed up between them.
  const [models, setModels] = useState(initialModels);
  const [copilotModels, setCopilotModels] = useState<CopilotModels>({
    status: "idle",
    options: [],
  });

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(MODELS_STORAGE_KEY) ?? "{}",
      );
      if (typeof saved !== "object" || saved === null) return;
      setModels((current) => {
        const next = { ...current };
        for (const p of Object.keys(current) as Provider[]) {
          if (typeof saved[p] === "string") next[p] = saved[p];
        }
        return next;
      });
    } catch {
      // Storage can be blocked or hold junk; each provider then starts on its default.
    }
  }, []);

  const usesCopilot = providers.includes("copilot");
  const copilotStatus = copilotModels.status;
  useEffect(() => {
    if (provider !== "copilot" || !usesCopilot || copilotStatus !== "idle") {
      return;
    }
    setCopilotModels({ status: "loading", options: [] });
    fetch("/api/assistant/models")
      .then(async (res) => {
        if (handleUnauthenticated(res)) return;
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data.models)) throw new Error();
        const options = data.models as ModelOption[];
        setCopilotModels({ status: "ready", options });
        // A remembered model the plan no longer offers gives way to the first one.
        setModels((current) =>
          options.length > 0 && !options.some((m) => m.id === current.copilot)
            ? { ...current, copilot: options[0].id }
            : current,
        );
      })
      .catch(() => setCopilotModels({ status: "error", options: [] }));
  }, [provider, usesCopilot, copilotStatus]);

  function pickModel(next: string) {
    const updated = { ...models, [provider]: next };
    setModels(updated);
    try {
      localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage can be blocked (private mode); the choice lasts for this visit.
    }
  }

  const options =
    modelsFor(provider) ??
    (provider === "copilot" ? copilotModels.options : []);
  const model = models[provider];

  return {
    model,
    options,
    label: options.find((m) => m.id === model)?.label ?? model,
    // Copilot models speak different APIs, which the picker's catalog told.
    api: copilotModels.options.find((m) => m.id === models.copilot)?.api,
    loading:
      provider === "copilot" &&
      (copilotModels.status === "idle" || copilotModels.status === "loading"),
    failed: copilotModels.status === "error" && provider === "copilot",
    pickModel,
  };
}
