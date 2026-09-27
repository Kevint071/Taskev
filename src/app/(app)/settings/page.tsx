import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-guard";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Ajustes | Taskev" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <SettingsView email={user.email} name={user.name} />;
}
