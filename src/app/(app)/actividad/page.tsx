import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ActivitySummary } from "@/components/activity/activity-summary";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { BackLink } from "@/components/groups/back-link";
import { LocalDate } from "@/components/local-date";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import { summarizeActivity } from "@/lib/activity";
import { getCurrentUser } from "@/lib/auth-guard";
import { getActivitySince } from "@/lib/data/repositories/activity";
import { startOfDayInTimeZone, TIME_ZONE_COOKIE } from "@/lib/time-zone";

export const metadata: Metadata = { title: "Actividad | Taskev" };

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const now = new Date();
  const cookieStore = await cookies();
  const timeZone = cookieStore.get(TIME_ZONE_COOKIE)?.value;
  const events = await getActivitySince(
    user.id,
    startOfDayInTimeZone(now, timeZone),
  );

  return (
    <div data-motion-ok="" className="flex min-w-0 flex-col gap-8">
      <div className="-mx-2 -mb-4 flex h-11 items-center">
        <BackLink href="/" label="Hoy" />
      </div>

      <header>
        <h1 className="text-page font-semibold">Actividad</h1>
        <p className="mt-1 text-muted first-letter:uppercase">
          <LocalDate
            date={now.toISOString()}
            options={{ weekday: "long", day: "numeric", month: "long" }}
          />
        </p>
      </header>

      {events.length === 0 ? (
        <EmptyState
          title="Todavía no hay actividad hoy"
          description="Aquí verás las tareas que crees, cambies de estado o comentes durante el día."
          action={
            <ButtonLink href="/" variant="primary">
              Volver a Hoy
            </ButtonLink>
          }
        />
      ) : (
        <>
          <ActivitySummary summary={summarizeActivity(events)} />
          <ActivityTimeline events={events} timeZone={timeZone} />
        </>
      )}
    </div>
  );
}
