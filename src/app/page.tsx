import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Landing } from "@/components/home/landing";
import { TodayDashboard } from "@/components/home/today-dashboard";
import { getCurrentUser } from "@/lib/auth-guard";

// Signed-in visitors get the dashboard ("Hoy"); the landing keeps the default title.
export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  return session?.user?.id ? { title: "Hoy | Taskev" } : {};
}

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  return (
    <AppShell user={user}>
      <TodayDashboard userId={user.id} name={user.name} />
    </AppShell>
  );
}
