import { NextResponse } from "next/server";
import { copilot } from "@/lib/ai/copilot";
import { getStoredKey } from "@/lib/ai/key-store";
import { ProviderError } from "@/lib/ai/provider";
import { requireUserId } from "@/lib/auth-guard";

/**
 * The models the user's Copilot plan offers. The other providers' models are
 * fixed (lib/ai/models.ts), so only Copilot is fetched.
 */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const apiKey = await getStoredKey(userId, "copilot");
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Configura tu token de GitHub Copilot en Ajustes",
        code: "no_key",
      },
      { status: 409 },
    );
  }

  try {
    return NextResponse.json({
      models: await copilot.listModels(apiKey),
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      console.warn("Assistant: listing Copilot models failed", {
        kind: error.kind,
        status: error.status,
        reason: error.reason,
      });
      return NextResponse.json(
        {
          error:
            error.kind === "invalid_key"
              ? "GitHub Copilot rechazó tu token. Reemplázalo en Ajustes."
              : "No se pudieron cargar los modelos de GitHub Copilot.",
          code: error.kind,
        },
        { status: error.kind === "invalid_key" ? 422 : 502 },
      );
    }
    throw error;
  }
}
