import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TodayDashboard } from "@/components/home/today-dashboard";
import { getCurrentUser } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "Hoy" };

// Internal target of the `/` rewrite in next.config.ts: signed-in visitors see
// this page at `/`, anonymous ones get the static landing.
export default async function TodayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <TodayDashboard userId={user.id} name={user.name} />;
}
