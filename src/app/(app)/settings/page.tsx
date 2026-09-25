import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/panel";
import { getCurrentUser } from "@/lib/auth-guard";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Ajustes | Taskev" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <PageHeader
        title="Ajustes"
        description="Tu cuenta y cómo se ve Taskev."
      />
      <SettingsView email={user.email} name={user.name} />
    </div>
  );
}
