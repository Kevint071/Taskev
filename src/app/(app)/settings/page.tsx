import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { maskKey } from "@/lib/ai/crypto";
import { getStoredKeys } from "@/lib/ai/key-store";
import { getCurrentUser } from "@/lib/auth-guard";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Ajustes | Taskev" };

function status(key: string | null) {
  return key
    ? { configured: true, last4: maskKey(key) }
    : { configured: false };
}

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const keys = await getStoredKeys(user.id);
  return (
    <SettingsView
      email={user.email}
      name={user.name}
      aiKeys={{ gemini: status(keys.gemini), groq: status(keys.groq) }}
    />
  );
}
