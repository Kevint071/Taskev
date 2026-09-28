import { NextResponse } from "next/server";
import { maskKey } from "@/lib/ai/crypto";
import { gemini } from "@/lib/ai/gemini";
import {
  clearGeminiKey,
  getStoredGeminiKey,
  saveGeminiKey,
} from "@/lib/ai/key-store";
import { ProviderError } from "@/lib/ai/provider";
import { getCurrentUser } from "@/lib/auth-guard";

const MAX_KEY_LENGTH = 200;

function unauthenticated() {
  return NextResponse.json({ error: "No autenticado" }, { status: 401 });
}

/** Only whether a key is set and its last 4 characters ever leave the server. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthenticated();

  const key = await getStoredGeminiKey(user.id);
  return NextResponse.json(
    key ? { configured: true, last4: maskKey(key) } : { configured: false },
  );
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthenticated();

  const body = await request.json().catch(() => null);
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (apiKey === "" || apiKey.length > MAX_KEY_LENGTH || /\s/.test(apiKey)) {
    return NextResponse.json(
      { error: "Pega una API key de Gemini válida" },
      { status: 400 },
    );
  }

  try {
    await gemini.verifyKey(apiKey);
  } catch (error) {
    if (error instanceof ProviderError && error.kind === "invalid_key") {
      return NextResponse.json(
        { error: "Gemini rechazó esta API key. Revisa que esté bien copiada" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "No se pudo verificar la key, inténtalo de nuevo" },
      { status: 502 },
    );
  }

  await saveGeminiKey(user.id, apiKey);
  return NextResponse.json({ configured: true, last4: maskKey(apiKey) });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return unauthenticated();

  await clearGeminiKey(user.id);
  return new NextResponse(null, { status: 204 });
}
