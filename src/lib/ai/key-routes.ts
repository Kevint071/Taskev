import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { maskKey } from "./crypto";
import { clearKey, getStoredKey, saveKey } from "./key-store";
import {
  PROVIDER_NAMES,
  type Provider,
  type ProviderClient,
  ProviderError,
} from "./provider";

const MAX_KEY_LENGTH = 200;

function unauthenticated() {
  return NextResponse.json({ error: "No autenticado" }, { status: 401 });
}

/**
 * GET/PUT/DELETE for one provider's key under /api/account/<provider>-key.
 * Only whether a key is set and its last 4 characters ever leave the server.
 */
export function keyRoutes(provider: Provider, client: ProviderClient) {
  const name = PROVIDER_NAMES[provider];

  return {
    async GET() {
      const user = await getCurrentUser();
      if (!user) return unauthenticated();

      const key = await getStoredKey(user.id, provider);
      return NextResponse.json(
        key ? { configured: true, last4: maskKey(key) } : { configured: false },
      );
    },

    async PUT(request: Request) {
      const user = await getCurrentUser();
      if (!user) return unauthenticated();

      const body = await request.json().catch(() => null);
      const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
      if (
        apiKey === "" ||
        apiKey.length > MAX_KEY_LENGTH ||
        /\s/.test(apiKey)
      ) {
        return NextResponse.json(
          { error: `Pega una API key de ${name} válida` },
          { status: 400 },
        );
      }

      try {
        await client.verifyKey(apiKey);
      } catch (error) {
        if (error instanceof ProviderError && error.kind === "invalid_key") {
          return NextResponse.json(
            {
              error: `${name} rechazó esta API key. Revisa que esté bien copiada`,
            },
            { status: 400 },
          );
        }
        return NextResponse.json(
          { error: "No se pudo verificar la key, inténtalo de nuevo" },
          { status: 502 },
        );
      }

      await saveKey(user.id, provider, apiKey);
      return NextResponse.json({ configured: true, last4: maskKey(apiKey) });
    },

    async DELETE() {
      const user = await getCurrentUser();
      if (!user) return unauthenticated();

      await clearKey(user.id, provider);
      return new NextResponse(null, { status: 204 });
    },
  };
}
