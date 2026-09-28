import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AgentInputError,
  type DisplayItem,
  type PendingAction,
  runAgent,
} from "@/lib/ai/agent";
import { titleFromMessage } from "@/lib/ai/conversations";
import { gemini } from "@/lib/ai/gemini";
import { groq } from "@/lib/ai/groq";
import { getStoredKeys } from "@/lib/ai/key-store";
import {
  isProvider,
  PROVIDER_NAMES,
  type Provider,
  type ProviderClient,
  ProviderError,
  type ProviderErrorKind,
} from "@/lib/ai/provider";
import { buildSystemInstruction } from "@/lib/ai/system-prompt";
import { describeDestructive, executeTool } from "@/lib/ai/tool-executor";
import { isDestructive, TOOL_DECLARATIONS } from "@/lib/ai/tools";
import { requireUserId } from "@/lib/auth-guard";
import {
  createConversation,
  getOwnedConversation,
  saveTurn,
} from "@/lib/data/conversations";
import type { TranscriptItem } from "@/lib/db/schema";
import { TIME_ZONE_COOKIE } from "@/lib/time-zone";

// Several chained model calls can outlast the platform's default timeout.
export const maxDuration = 60;

const MAX_BODY_BYTES = 20_000;
const MAX_MESSAGE_LENGTH = 4000;
/** Keeps arbitrary amounts of stored context from being relayed to a model. */
const MAX_HISTORY_BYTES = 200_000;

const CLIENTS: Record<Provider, ProviderClient> = { gemini, groq };

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

type RequestBody =
  | { conversationId: string | null; provider: Provider; message: string }
  | {
      conversationId: string;
      confirmation: { callId: string; approved: boolean };
    };

function parseBody(raw: unknown): RequestBody | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId : null;
  if (body.conversationId != null && conversationId === null) return null;

  if (typeof body.message === "string") {
    const message = body.message.trim();
    if (!message || message.length > MAX_MESSAGE_LENGTH) return null;
    if (!isProvider(body.provider)) return null;
    return { conversationId, provider: body.provider, message };
  }
  const confirmation = body.confirmation as Record<string, unknown> | undefined;
  if (
    conversationId &&
    typeof confirmation?.callId === "string" &&
    typeof confirmation.approved === "boolean"
  ) {
    return {
      conversationId,
      confirmation: {
        callId: confirmation.callId,
        approved: confirmation.approved,
      },
    };
  }
  return null;
}

function toTranscript(item: DisplayItem): TranscriptItem {
  return item.type === "text"
    ? { kind: "assistant", text: item.text }
    : { kind: "action", text: item.text, isError: item.isError };
}

/** What the user sees for their message; mirrors the chat view. */
function sentItems(
  message: string,
  declined: PendingAction | null,
): TranscriptItem[] {
  return [
    // A new message declines whatever was waiting for confirmation.
    ...(declined
      ? [
          {
            kind: "action" as const,
            text: `Sin confirmar: ${declined.summary}`,
            isError: false,
          },
        ]
      : []),
    { kind: "user", text: message },
  ];
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const text = await request.text();
  let raw: unknown = null;
  if (Buffer.byteLength(text, "utf8") <= MAX_BODY_BYTES) {
    try {
      raw = JSON.parse(text);
    } catch {
      // Malformed JSON is reported below like any other invalid body.
    }
  }
  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const conversation = body.conversationId
    ? await getOwnedConversation(userId, body.conversationId)
    : null;
  if (body.conversationId && !conversation) {
    return NextResponse.json(
      { error: "Esta conversación ya no existe", code: "not_found" },
      { status: 404 },
    );
  }

  // A confirmation is answered by the model that proposed the action.
  const provider =
    "confirmation" in body && conversation
      ? conversation.provider
      : (body as { provider: Provider }).provider;
  const apiKey = (await getStoredKeys(userId))[provider];
  if (!apiKey) {
    return NextResponse.json(
      {
        error: `Configura tu API key de ${PROVIDER_NAMES[provider]} en Ajustes`,
        code: "no_key",
      },
      { status: 409 },
    );
  }

  const history = conversation?.history ?? [];
  if (Buffer.byteLength(JSON.stringify(history), "utf8") > MAX_HISTORY_BYTES) {
    return NextResponse.json(
      {
        error:
          "La conversación es demasiado larga. Empieza una nueva conversación.",
      },
      { status: 413 },
    );
  }

  const now = new Date();
  const timeZone = (await cookies()).get(TIME_ZONE_COOKIE)?.value ?? null;
  const ctx = { userId, timeZone, now };
  const system = buildSystemInstruction(now, timeZone);
  const tools = [...TOOL_DECLARATIONS];
  const client = CLIENTS[provider];

  try {
    const result = await runAgent(
      {
        generate: (steps) => client.generate(apiKey, steps, tools, system),
        execute: (name, args) => executeTool(ctx, name, args),
        describe: (name, args) => describeDestructive(ctx, name, args),
        isDestructive,
      },
      history,
      "message" in body
        ? { message: body.message }
        : { confirmation: body.confirmation },
    );

    const turn = {
      provider,
      history: result.history,
      transcript: [
        ...(conversation?.transcript ?? []),
        ...("message" in body
          ? sentItems(body.message, conversation?.pending ?? null)
          : []),
        ...result.display.map(toTranscript),
      ],
      pending: result.pending,
    };
    const saved = conversation
      ? await saveTurn(userId, conversation.id, conversation.version, turn)
      : await createConversation(
          userId,
          titleFromMessage((body as { message: string }).message),
          turn,
        );
    if (!saved) {
      return NextResponse.json(
        {
          error:
            "Esta conversación cambió en otra pestaña. Recárgala para continuar.",
          code: "conflict",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      conversation: saved,
      display: result.display,
      pending: result.pending,
    });
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
