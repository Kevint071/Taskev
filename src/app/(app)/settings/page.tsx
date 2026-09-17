import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/panel";
import { getCurrentUser } from "@/lib/auth-guard";
import {
  AppearanceSection,
  DeleteAccountSection,
  PasswordSection,
  ProfileSection,
} from "./sections";

export const metadata: Metadata = { title: "Ajustes | Taskev" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex max-w-[640px] flex-col gap-8">
      <PageHeader
        title="Ajustes"
        description="Tu cuenta y cómo se ve Taskev."
      />
      <div className="flex flex-col divide-y divide-line border-y border-line">
        <AppearanceSection />
        <ProfileSection email={user.email} name={user.name} />
        <PasswordSection />
        <DeleteAccountSection email={user.email} />
      </div>
    </div>
  );
}
