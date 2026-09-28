/**
 * Builds, from the stored provider-neutral history, what one provider can
 * accept. A closed turn that another provider produced (even in part) can't
 * be replayed natively: Gemini rejects function calls without its thought
 * signatures, and other providers' private steps mean nothing to it. Such a
 * turn is sent as text instead, keeping the reply and what the tools did.
 */
import type { HistoryStep, Provider } from "./provider";

/** Characters kept of each tool result in a collapsed turn. */
export const RESULT_PREVIEW = 500;

function textOf(step: HistoryStep): string {
  if (!Array.isArray(step.content)) return "";
  return (step.content as { type?: string; text?: unknown }[])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
}

function preview(value: unknown): string {
  const json = JSON.stringify(value ?? {});
  return json.length > RESULT_PREVIEW
    ? `${json.slice(0, RESULT_PREVIEW)}…`
    : json;
}

function collapse(turn: HistoryStep[], provider: Provider): HistoryStep[] {
  const [input, ...steps] = turn;
  const replies = steps
    .filter((s) => s.type === "model_output")
    .map(textOf)
    .filter(Boolean);
  const results = new Map(
    steps
      .filter((s) => s.type === "function_result")
      .map((s) => [s.call_id, s]),
  );
  const actions = steps
    .filter((s) => s.type === "function_call")
    .map((call) => {
      const answer = results.get(call.id);
      const outcome = !answer
        ? "sin respuesta"
        : `${answer.is_error ? "error: " : ""}${preview(answer.result)}`;
      return `- ${String(call.name)}(${JSON.stringify(call.arguments ?? {})}) → ${outcome}`;
    });

  const parts = [replies.join("\n")];
  if (actions.length > 0) {
    parts.push(`Acciones realizadas en este turno:\n${actions.join("\n")}`);
  }
  const text = parts.filter(Boolean).join("\n\n");
  if (!text) return [input];
  return [
    input,
    { type: "model_output", content: [{ type: "text", text }], provider },
  ];
}

export function renderTurnsFor(
  provider: Provider,
  history: HistoryStep[],
): HistoryStep[] {
  const current = history.findLastIndex((s) => s.type === "user_input");
  const rendered: HistoryStep[] = [];
  let turn: HistoryStep[] = [];

  const flush = () => {
    const foreign = turn.some(
      (s) => typeof s.provider === "string" && s.provider !== provider,
    );
    rendered.push(
      ...(foreign && turn[0]?.type === "user_input"
        ? collapse(turn, provider)
        : turn),
    );
    turn = [];
  };

  for (const [index, step] of history.entries()) {
    if (step.type === "user_input") flush();
    if (index === current) {
      // The turn in progress always belongs to the provider answering it.
      rendered.push(...history.slice(index));
      return rendered;
    }
    turn.push(step);
  }
  flush();
  return rendered;
}
