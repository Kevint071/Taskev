import { redirect } from "next/navigation";
import { AgendaDashboard } from "@/components/agenda/agenda-dashboard";
import { getCurrentUser } from "@/lib/auth-guard";

export default async function AgendaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <AgendaDashboard userId={user.id} />;
}
