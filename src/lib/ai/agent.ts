/**
 * The assistant's loop, free of I/O: the model, the tool executor and the
 * confirmation texts come in as dependencies. The history is the only state
 * and travels with every request, so a destructive call simply stays
 * unanswered in it until the user confirms or cancels it.
 */
import type { GenerateResult, HistoryStep } from "./gemini";
import type { ToolOutcome } from "./tool-executor";

/** Tool calls allowed per user message, confirmed ones included. */
export const MAX_TOOL_CALLS = 8;

export type AgentDeps = {
  generate(history: HistoryStep[]): Promise<GenerateResult>;
  execute(name: string, args: Record<string, unknown>): Promise<ToolOutcome>;
  /** Confirmation text, or an error to answer if the target doesn't exist. */
  describe(
    name: string,
    args: Record<string, unknown>,
  ): Promise<
    { ok: true; summary: string } | { ok: false; outcome: ToolOutcome }
  >;
  isDestructive(name: string): boolean;
};

export type DisplayItem =
  | { type: "text"; text: string }
  | { type: "action"; text: string; isError: boolean };

export type PendingAction = { callId: string; name: string; summary: string };

export type AgentInput =
  | { message: string }
  | { confirmation: { callId: string; approved: boolean } };

export type AgentResult = {
  history: HistoryStep[];
  display: DisplayItem[];
  pending: PendingAction | null;
};

/** The request doesn't match the history (e.g. a stale confirmation). */
export class AgentInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentInputError";
  }
}

type Call = { id: string; name: string; args: Record<string, unknown> };

const STEP_LIMIT = "step_limit";
const NO_ANSWER = "No obtuve respuesta del asistente. Inténtalo de nuevo.";

function userInput(text: string): HistoryStep {
  return { type: "user_input", content: [{ type: "text", text }] };
}

function functionResult(
  call: Call,
  result: Record<string, unknown>,
  isError: boolean,
): HistoryStep {
  return {
    type: "function_result",
    call_id: call.id,
    name: call.name,
    result,
    ...(isError ? { is_error: true } : {}),
  };
}

/** Steps since the user's latest message: the current turn. */
function currentTurn(history: HistoryStep[]): HistoryStep[] {
  const lastInput = history.findLastIndex((s) => s.type === "user_input");
  return history.slice(lastInput + 1);
}

function unansweredCalls(history: HistoryStep[]): Call[] {
  const turn = currentTurn(history);
  const answered = new Set(
    turn.filter((s) => s.type === "function_result").map((s) => s.call_id),
  );
  return turn
    .filter((s) => s.type === "function_call" && !answered.has(s.id))
    .map((s) => ({
      id: String(s.id),
      name: String(s.name),
      args:
        typeof s.arguments === "object" && s.arguments !== null
          ? (s.arguments as Record<string, unknown>)
          : {},
    }));
}

function turnResults(history: HistoryStep[]) {
  return currentTurn(history).filter((s) => s.type === "function_result");
}

function isCompleted(step: HistoryStep): boolean {
  const result = step.result as { rejected?: boolean } | undefined;
  return step.is_error !== true && result?.rejected !== true;
}

export async function runAgent(
  deps: AgentDeps,
  initialHistory: HistoryStep[],
  input: AgentInput,
): Promise<AgentResult> {
  const history = [...initialHistory];
  const display: DisplayItem[] = [];

  function answer(call: Call, outcome: ToolOutcome) {
    history.push(functionResult(call, outcome.result, outcome.isError));
    if (outcome.display) {
      display.push({
        type: "action",
        text: outcome.display,
        isError: outcome.isError,
      });
    }
  }

  if ("message" in input) {
    // Gemini needs every call answered before the next user message: an
    // action left pending is treated as declined.
    for (const call of unansweredCalls(history)) {
      history.push(
        functionResult(
          call,
          {
            rejected: true,
            message: "El usuario envió otro mensaje sin confirmar la acción",
          },
          false,
        ),
      );
    }
    history.push(userInput(input.message));
  } else {
    const { callId, approved } = input.confirmation;
    const call = unansweredCalls(history).find((c) => c.id === callId);
    if (!call || !deps.isDestructive(call.name)) {
      throw new AgentInputError("Esa acción ya no está pendiente");
    }
    if (approved) {
      answer(call, await deps.execute(call.name, call.args));
    } else {
      const described = await deps.describe(call.name, call.args);
      history.push(
        functionResult(
          call,
          { rejected: true, message: "El usuario canceló la acción" },
          false,
        ),
      );
      display.push({
        type: "action",
        text: described.ok ? `Cancelado: ${described.summary}` : "Cancelado",
        isError: false,
      });
    }
  }

  while (true) {
    const calls = unansweredCalls(history);
    if (calls.length > 0) {
      let used = turnResults(history).length;
      let limitHit = false;
      let pending: PendingAction | null = null;

      const refuse = (call: Call) => {
        limitHit = true;
        history.push(functionResult(call, { error: STEP_LIMIT }, true));
      };

      // Safe calls first, so they run even when a destructive one waits.
      for (const call of calls.filter((c) => !deps.isDestructive(c.name))) {
        if (used >= MAX_TOOL_CALLS) {
          refuse(call);
          continue;
        }
        answer(call, await deps.execute(call.name, call.args));
        used++;
      }
      for (const call of calls.filter((c) => deps.isDestructive(c.name))) {
        if (pending) break; // The rest wait for later confirmations.
        if (used >= MAX_TOOL_CALLS) {
          refuse(call);
          continue;
        }
        const described = await deps.describe(call.name, call.args);
        if (described.ok) {
          pending = {
            callId: call.id,
            name: call.name,
            summary: described.summary,
          };
        } else {
          answer(call, described.outcome);
          used++;
        }
      }

      if (limitHit) {
        const completed = turnResults(history).filter(isCompleted).length;
        display.push({
          type: "text",
          text: `Me detuve al llegar al límite de ${MAX_TOOL_CALLS} acciones por mensaje. Se completaron ${completed} (las ves arriba); pídeme que continúe con el resto.`,
        });
      }
      if (pending || limitHit) return { history, display, pending };
    }

    const step = await deps.generate(history);
    history.push(...step.steps);
    if (step.text) display.push({ type: "text", text: step.text });
    if (step.calls.length === 0) {
      if (!step.text) display.push({ type: "text", text: NO_ANSWER });
      return { history, display, pending: null };
    }
  }
}
