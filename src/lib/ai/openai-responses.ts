/**
 * Minimal client for the OpenAI Responses API, which some Copilot models (GPT
 * 5.5+, Grok, Codex) use instead of Chat Completions. Stateless
 * (`store: false`): the provider-neutral history is rebuilt as input items on
 * every request. Nothing outside this module knows the wire format.
 */
import { renderTurnsFor } from "./history";
import {
  errorFor,
  type OpenAiCompatibleConfig,
  parseArguments,
  textOf,
} from "./openai-compatible";
import {
  type FunctionCall,
  type FunctionDeclaration,
  type GenerateResult,
  type HistoryStep,
  isRecord,
  type Provider,
  ProviderError,
} from "./provider";

type InputItem =
  | { role: "user"; content: { type: "input_text"; text: string }[] }
  | { role: "assistant"; content: { type: "output_text"; text: string }[] }
  | { type: "function_call"; call_id: string; name: string; arguments: string }
  | { type: "function_call_output"; call_id: string; output: string };

function toInput(history: HistoryStep[]): InputItem[] {
  const items: InputItem[] = [];
  for (const step of history) {
    switch (step.type) {
      case "user_input":
        items.push({
          role: "user",
          content: [{ type: "input_text", text: textOf(step) }],
        });
        break;
      case "model_output": {
        const text = textOf(step);
        if (text) {
          items.push({
            role: "assistant",
            content: [{ type: "output_text", text }],
          });
        }
        break;
      }
      case "function_call":
        // No item id: with `store: false` a call sent with the id of its
        // (unsent) reasoning item is rejected.
        items.push({
          type: "function_call",
          call_id: String(step.id),
          name: String(step.name),
          arguments: JSON.stringify(step.arguments ?? {}),
        });
        break;
      case "function_result":
        items.push({
          type: "function_call_output",
          call_id: String(step.call_id),
          output: JSON.stringify(step.result ?? {}),
        });
        break;
      // Anything else (reasoning, other providers' private steps) stays out.
    }
  }
  return items;
}

function parseOutput(output: unknown[], provider: Provider): GenerateResult {
  const steps: HistoryStep[] = [];
  const calls: FunctionCall[] = [];
  const text: string[] = [];

  for (const item of output) {
    if (!isRecord(item)) continue;
    if (item.type === "message" && Array.isArray(item.content)) {
      const parts = (item.content as { type?: string; text?: unknown }[])
        .filter((part) => part.type === "output_text")
        .map((part) => (typeof part.text === "string" ? part.text : ""))
        .join("");
      if (parts) {
        text.push(parts);
        steps.push({
          type: "model_output",
          content: [{ type: "text", text: parts }],
          provider,
        });
      }
    } else if (item.type === "function_call") {
      const call = {
        id: String(item.call_id),
        name: String(item.name),
        args: parseArguments(item.arguments),
      };
      calls.push(call);
      steps.push({
        type: "function_call",
        id: call.id,
        name: call.name,
        arguments: call.args,
        provider,
      });
    }
  }
  return { steps, text: text.join(""), calls };
}

/** `generate` for a model served over `/responses`. */
export function createResponsesGenerate(
  config: OpenAiCompatibleConfig,
  request: (
    apiKey: string,
    path: string,
    init: RequestInit,
  ) => Promise<Response>,
) {
  const { provider } = config;

  return async function generate(
    apiKey: string,
    history: HistoryStep[],
    tools: readonly FunctionDeclaration[],
    system: string,
    model: string,
  ): Promise<GenerateResult> {
    const response = await request(apiKey, "/responses", {
      method: "POST",
      body: JSON.stringify({
        model,
        instructions: system,
        input: toInput(renderTurnsFor(provider, history)),
        tools: tools.map(({ name, description, parameters }) => ({
          type: "function",
          name,
          description,
          parameters,
          // The tool schemas aren't in strict-mode shape.
          strict: false,
        })),
        store: false,
      }),
    });
    if (!response.ok) throw await errorFor(response, provider);

    const body = (await response.json().catch(() => null)) as {
      output?: unknown;
    } | null;
    if (!Array.isArray(body?.output)) {
      throw new ProviderError(provider, "unavailable");
    }
    return parseOutput(body.output, provider);
  };
}
