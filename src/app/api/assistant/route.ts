import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AgentInputError, runAgent } from "@/lib/ai/agent";
import { gemini } from "@/lib/ai/gemini";
import { getStoredKey } from "@/lib/ai/key-store";
import {
  PROVIDER_NAMES,
  type Provider,
  ProviderError,
  type ProviderErrorKind,
} from "@/lib/ai/provider";
import { buildSystemInstruction } from "@/lib/ai/system-prompt";
import { describeDestructive, executeTool } from "@/lib/ai/tool-executor";
import { isDestructive, TOOL_DECLARATIONS } from "@/lib/ai/tools";
import { requireUserId } from "@/lib/auth-guard";
import { TIME_ZONE_COOKIE } from "@/lib/time-zone";

// Several chained Gemini calls can outlast the platform's default timeout.
export const maxDuration = 60;

/** Keeps arbitrary payloads from being relayed to Google. */
const MAX_BODY_BYTES = 200_000;
const MAX_MESSAGE_LENGTH = 4000;

function providerError(
  provider: Provider,
  kind: ProviderErrorKind,
): { status: number; error: string } {
  const name = PROVIDER_NAMES[provider];
  switch (kind) {
    case "invalid_key":
      return {
        status: 422,
        error: `${name} rechazó tu API key; puede que la hayas revocado. Reemplázala en Ajustes.`,
      };
    case "quota":
      return {
        status: 429,
        error: `Se alcanzó el límite de uso de tu API key de ${name}. Inténtalo de nuevo más tarde o cambia de modelo.`,
      };
    case "too_large":
      return {
        status: 413,
        error: `La conversación supera el límite de tu plan de ${name}. Cambia de modelo o empieza una nueva conversación.`,
      };
    case "unavailable":
      return {
        status: 503,
        error: `${name} no está disponible en este momento. Inténtalo de nuevo en unos minutos.`,
      };
    case "bad_request":
      return {
        status: 502,
        error: `${name} no pudo procesar esta conversación. Empieza una nueva conversación.`,
      };
  }
}

type RequestBody = {
  history: { type: string; [field: string]: unknown }[];
} & (
  | { message: string }
  | { confirmation: { callId: string; approved: boolean } }
);

function parseBody(raw: unknown): RequestBody | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const history = body.history;
  if (
    !Array.isArray(history) ||
    !history.every(
      (step) =>
        typeof step === "object" &&
        step !== null &&
        typeof (step as { type?: unknown }).type === "string",
    )
  ) {
    return null;
  }
  if (typeof body.message === "string") {
    const message = body.message.trim();
    if (!message || message.length > MAX_MESSAGE_LENGTH) return null;
    return { history, message };
  }
  const confirmation = body.confirmation as Record<string, unknown> | undefined;
  if (
    typeof confirmation?.callId === "string" &&
    typeof confirmation.approved === "boolean"
  ) {
    return {
      history,
      confirmation: {
        callId: confirmation.callId,
        approved: confirmation.approved,
      },
    };
  }
  return null;
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json(
      {
        error:
          "La conversación es demasiado larga. Empieza una nueva conversación.",
      },
      { status: 413 },
    );
  }
  let raw: unknown = null;
  try {
    raw = JSON.parse(text);
  } catch {
    // Malformed JSON is reported below like any other invalid body.
  }
  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const apiKey = await getStoredKey(userId, "gemini");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Configura tu API key de Gemini en Ajustes", code: "no_key" },
      { status: 409 },
    );
  }

  const now = new Date();
  const timeZone = (await cookies()).get(TIME_ZONE_COOKIE)?.value ?? null;
  const ctx = { userId, timeZone, now };
  const system = buildSystemInstruction(now, timeZone);
  const tools = [...TOOL_DECLARATIONS];

  try {
    const result = await runAgent(
      {
        generate: (history) => gemini.generate(apiKey, history, tools, system),
        execute: (name, args) => executeTool(ctx, name, args),
        describe: (name, args) => describeDestructive(ctx, name, args),
        isDestructive,
      },
      body.history,
      "message" in body
        ? { message: body.message }
        : { confirmation: body.confirmation },
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AgentInputError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof ProviderError) {
      console.warn("Assistant: provider request failed", {
        provider: error.provider,
        kind: error.kind,
        status: error.status,
        reason: error.reason,
      });
      const { status, error: message } = providerError(
        error.provider,
        error.kind,
      );
      return NextResponse.json(
        { error: message, code: error.kind },
        { status },
      );
    }
    throw error;
  }
}
