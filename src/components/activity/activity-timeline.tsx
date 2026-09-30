import Link from "next/link";
import type { CSSProperties } from "react";
import { STATUS_LABELS } from "@/components/group-types";
import { ArrowRightIcon } from "@/components/ui/icons";
import { STATUS_TONE } from "@/components/ui/status-badge";
import { taskHref } from "@/lib/back-navigation";
import type { ActivityEvent } from "@/lib/data/activity";
import { LocalTime } from "./local-time";

/** Entries that stagger in; the rest of a long day just appear. */
const STAGGERED = 8;

/**
 * Today's changes as a timeline, newest first: the time on the left, a dot on
 * the rail colored by what happened, and a card with the task and the change.
 * Consecutive changes in the same group sit under one group label on the rail.
 * Each card opens the task, which comes back here.
 */
export function ActivityTimeline({
  events,
  timeZone,
}: {
  events: ActivityEvent[];
  timeZone?: string;
}) {
  return (
    <ol className="flex min-w-0 flex-col">
      {events.flatMap((event, i) => {
        const delay = {
          "--delay": `${Math.min(i, STAGGERED) * 55}ms`,
        } as CSSProperties;
        const item = (
          <li
            key={event.id}
            className="group/item animate-rise flex min-w-0 gap-3 md:gap-5"
            style={delay}
          >
            <LocalTime
              date={event.createdAt.toISOString()}
              timeZone={timeZone}
              className="tabular w-11 shrink-0 pt-4 text-right text-meta text-muted"
            />
            <div className="relative min-w-0 flex-1 border-l border-line-strong pb-4 pl-5 group-last/item:border-transparent md:pl-6">
              <span
                aria-hidden="true"
                className="absolute top-5 -left-1.25 size-2.5 rounded-full ring-4 ring-surface"
                style={{ backgroundColor: eventTone(event) }}
              />
              <EventCard event={event} />
            </div>
          </li>
        );
        // Consecutive changes in the same group share one label on the rail.
        if (i > 0 && events[i - 1].groupId === event.groupId) return [item];
        return [
          <li
            key={`group-${event.id}`}
            className="animate-rise flex min-w-0 gap-3 md:gap-5"
            style={delay}
          >
            <span aria-hidden="true" className="w-11 shrink-0" />
            <p className="min-w-0 flex-1 truncate border-l border-line-strong pt-1 pb-2 pl-5 text-meta font-semibold text-muted md:pl-6">
              {event.groupName}
            </p>
          </li>,
          item,
        ];
      })}
    </ol>
  );
}

function EventCard({ event }: { event: ActivityEvent }) {
  return (
    <Link
      href={taskHref(event.groupId, event.taskId, "actividad")}
      className="group flex min-w-0 flex-col gap-1.5 rounded-2xl border border-line bg-raised px-4 py-3 transition-[translate,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/50"
    >
      <p className="line-clamp-2 wrap-break-word text-body font-semibold leading-snug">
        {event.taskTitle}
      </p>
      {event.type === "comment_added" && event.body ? (
        <p className="line-clamp-3 wrap-break-word text-meta text-muted">
          <span className="font-medium text-ink">Nueva nota:</span> {event.body}
        </p>
      ) : (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-meta text-muted">
          <EventSummary event={event} />
        </div>
      )}
    </Link>
  );
}

/** Color that names the outcome of a change: its status, or a neutral one. */
function eventTone(event: ActivityEvent): string {
  if (event.type === "task_created") return "var(--accent)";
  if (event.type === "comment_added") return "var(--line-strong)";
  return event.toStatus ? STATUS_TONE[event.toStatus] : "var(--status-open)";
}

/** The change in a few words: "Tarea creada", "Nueva nota", "A → B". */
function EventSummary({ event }: { event: ActivityEvent }) {
  switch (event.type) {
    case "task_created":
      return <span className="font-medium text-ink">Tarea creada</span>;
    case "comment_added":
      return <span className="font-medium text-ink">Nueva nota</span>;
    case "status_changed":
      if (!event.toStatus) {
        return <span className="font-medium text-ink">Estado actualizado</span>;
      }
      return (
        <span className="inline-flex items-center gap-1.5">
          {event.fromStatus && (
            <>
              <span>{STATUS_LABELS[event.fromStatus]}</span>
              <ArrowRightIcon />
            </>
          )}
          <span className="inline-flex items-center gap-1.5 font-medium text-ink">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full"
              style={{ backgroundColor: STATUS_TONE[event.toStatus] }}
            />
            {STATUS_LABELS[event.toStatus]}
          </span>
        </span>
      );
  }
}
