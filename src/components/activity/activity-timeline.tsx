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
 * the rail colored by what happened, and a card with the task, its group and
 * the change. Each card opens the task, which comes back here.
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
      {events.map((event, i) => (
        <li
          key={event.id}
          className="group/item animate-rise flex min-w-0 gap-3 md:gap-5"
          style={
            { "--delay": `${Math.min(i, STAGGERED) * 55}ms` } as CSSProperties
          }
        >
          <LocalTime
            date={event.createdAt.toISOString()}
            timeZone={timeZone}
            className="tabular w-11 shrink-0 pt-4 text-right text-meta text-muted"
          />
          <div className="relative min-w-0 flex-1 border-l border-line-strong pb-4 pl-5 group-last/item:border-transparent md:pl-6">
            <span
              aria-hidden="true"
              className="absolute top-5.5 -left-1.25 size-2.5 rounded-full ring-4 ring-surface"
              style={{ backgroundColor: eventTone(event) }}
            />
            <EventCard event={event} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function EventCard({ event }: { event: ActivityEvent }) {
  return (
    <Link
      href={taskHref(event.groupId, event.taskId, "actividad")}
      className="group flex min-w-0 flex-col gap-2 rounded-2xl border border-line bg-raised p-4 shadow-panel transition-[translate,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/50"
    >
      <div className="min-w-0">
        <p className="line-clamp-2 wrap-break-word text-body font-semibold leading-snug">
          {event.taskTitle}
        </p>
        <p className="mt-0.5 truncate text-meta text-muted">
          {event.groupName}
        </p>
      </div>
      <div className="text-meta text-muted">
        <EventSummary event={event} />
      </div>
      {event.type === "comment_added" && event.body && (
        <p className="line-clamp-3 wrap-break-word border-l-2 border-line-strong pl-3 text-ui text-ink">
          {event.body}
        </p>
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
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          {event.fromStatus && (
            <>
              <StatusPill status={event.fromStatus} muted />
              <ArrowRightIcon />
            </>
          )}
          <StatusPill status={event.toStatus} />
        </span>
      );
  }
}

/** The state a task moved to is solid; the one it left is the same, dimmed. */
function StatusPill({
  status,
  muted = false,
}: {
  status: keyof typeof STATUS_TONE;
  muted?: boolean;
}) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${muted ? "text-muted" : "text-ink"}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${tone} ${muted ? 8 : 16}%, transparent)`,
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: tone }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
