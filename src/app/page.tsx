import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Landing } from "@/components/home/landing";
import { TodayDashboard } from "@/components/home/today-dashboard";
import { getCurrentUser } from "@/lib/auth-guard";
import { SITE_JSON_LD } from "@/lib/site";

// Signed-in visitors get the dashboard ("Hoy"); the landing keeps the default title.
export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  return session?.user?.id
    ? { title: "Hoy", alternates: { canonical: "/" } }
    : { alternates: { canonical: "/" } };
}

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD built from constants, "<" escaped against script breakout
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(SITE_JSON_LD).replace(/</g, "\\u003c"),
          }}
        />
        <Landing />
      </>
    );
  }

  return (
    <AppShell user={user}>
      <TodayDashboard userId={user.id} name={user.name} />
    </AppShell>
  );
}
