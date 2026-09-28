import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { maskKey } from "@/lib/ai/crypto";
import { getStoredGeminiKey } from "@/lib/ai/key-store";
import { getCurrentUser } from "@/lib/auth-guard";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Ajustes | Taskev" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const key = await getStoredGeminiKey(user.id);
  return (
    <SettingsView
      email={user.email}
      name={user.name}
      geminiKey={
        key ? { configured: true, last4: maskKey(key) } : { configured: false }
      }
    />
  );
}
