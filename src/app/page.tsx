import { AppShell } from "@/components/app-shell";
import { Landing } from "@/components/home/landing";
import { TodayDashboard } from "@/components/home/today-dashboard";
import { getCurrentUser } from "@/lib/auth-guard";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  return (
    <AppShell user={user}>
      <TodayDashboard userId={user.id} name={user.name} />
    </AppShell>
  );
}
