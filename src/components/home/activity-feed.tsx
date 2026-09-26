import Link from "next/link";
import { STATUS_LABELS } from "@/components/group-types";
import {
  CheckIcon,
  ChevronDownIcon,
  NoteIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { STATUS_TONE } from "@/components/ui/status-badge";
import type { TaskActivity } from "@/lib/activity";
import { taskHref } from "@/lib/back-navigation";
import type { ActivityEvent } from "@/lib/data/activity";
import { formatRelativeTime } from "@/lib/format";

/** Tasks shown before the rest fold behind "Ver más". */
const VISIBLE_TASKS = 4;

/**
 * Today's activity as one card per task: what happened last, in plain words,
 * with older changes folded away so the feed stays short on a phone.
 */
export function ActivityFeed({ tasks }: { tasks: TaskActivity[] }) {
  const changes = tasks.reduce((sum, t) => sum + t.events.length, 0);
  const visible = tasks.slice(0, VISIBLE_TASKS);
  const hidden = tasks.slice(VISIBLE_TASKS);

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Actividad de hoy</h2>
        <span className="tabular text-meta text-muted">
          {changes} {changes === 1 ? "cambio" : "cambios"}
        </span>
      </div>
      <ul className="flex min-w-0 flex-col gap-2">
        {visible.map((task) => (
          <li key={task.taskId}>
            <ActivityCard task={task} />
          </li>
        ))}
      </ul>
      {hidden.length > 0 && (
        <details className="group/more">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-control py-1 text-meta font-medium text-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
            <span className="group-open/more:hidden">
              Ver {hidden.length} {hidden.length === 1 ? "tarea" : "tareas"} más
            </span>
            <span className="hidden group-open/more:inline">Ver menos</span>
            <ChevronDownIcon className="size-3.5 transition-transform group-open/more:rotate-180" />
          </summary>
          <ul className="mt-2 flex min-w-0 flex-col gap-2">
            {hidden.map((task) => (
              <li key={task.taskId}>
                <ActivityCard task={task} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function ActivityCard({ task }: { task: TaskActivity }) {
  const [latest, ...older] = task.events;

  return (
    <article className="relative flex min-w-0 gap-3 rounded-panel border border-line bg-raised px-3.5 py-3 shadow-panel transition-colors hover:border-line-strong">
      <EventBadge event={latest} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[12px] leading-4 text-muted">
            {task.groupName}
          </span>
          <span className="tabular shrink-0 text-[12px] leading-4 text-muted">
            {formatRelativeTime(latest.createdAt)}
          </span>
        </div>
        {/* The ::after stretches the link over the card; the folded
            history sits above it so its toggle stays clickable. */}
        <Link
          href={taskHref(task.groupId, task.taskId, "hoy")}
          className="mt-0.5 line-clamp-2 font-semibold after:absolute after:inset-0 after:rounded-panel md:truncate"
        >
          {task.taskTitle}
        </Link>
        <p className="mt-1 min-w-0 text-meta text-muted">
          <EventSentence event={latest} />
        </p>

        {older.length > 0 && (
          <details className="group/history relative z-10 mt-2">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-control text-[12px] font-medium text-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
              {older.length}{" "}
              {older.length === 1 ? "cambio anterior" : "cambios anteriores"}
              <ChevronDownIcon className="size-3.5 transition-transform group-open/history:rotate-180" />
            </summary>
            <ol className="mt-2 flex flex-col gap-2 border-l border-line pl-3">
              {older.map((event) => (
                <li
                  key={event.id}
                  className="flex min-w-0 items-baseline justify-between gap-3 text-meta text-muted"
                >
                  <span className="min-w-0">
                    <EventSentence event={event} />
                  </span>
                  <span className="tabular shrink-0 text-[12px]">
                    {formatRelativeTime(event.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </article>
  );
}

/** Round icon naming the kind of change at a glance, tinted by its outcome. */
function EventBadge({ event }: { event: ActivityEvent }) {
  const base =
    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full";

  if (event.type === "task_created") {
    return (
      <span className={`${base} bg-accent-soft text-accent`}>
        <PlusIcon className="size-4" />
      </span>
    );
  }

  if (event.type === "comment_added") {
    return (
      <span className={`${base} bg-sunken text-muted`}>
        <NoteIcon className="size-4" />
      </span>
    );
  }

  const tone = event.toStatus
    ? STATUS_TONE[event.toStatus]
    : "var(--status-open)";
  return (
    <span
      className={base}
      style={{
        backgroundColor: `color-mix(in srgb, ${tone} 16%, transparent)`,
        color: tone,
      }}
    >
      {event.toStatus === "completada" ? (
        <CheckIcon className="size-4" />
      ) : (
        <span className="size-2.5 rounded-full bg-current" />
      )}
    </span>
  );
}

/** The change as a short Spanish sentence: "Pasó a En curso", "Nota: …". */
function EventSentence({ event }: { event: ActivityEvent }) {
  switch (event.type) {
    case "task_created":
      return <>Tarea creada</>;
    case "comment_added":
      return (
        <span className="line-clamp-2 break-words">
          <span className="text-ink">Nota:</span> {event.body}
        </span>
      );
    case "status_changed":
      if (!event.toStatus) return <>Estado actualizado</>;
      return (
        <span className="inline-flex flex-wrap items-center gap-x-1.5">
          {event.toStatus === "completada" ? "Marcada como" : "Pasó a"}
          <StatusPill status={event.toStatus} />
        </span>
      );
  }
}

function StatusPill({ status }: { status: keyof typeof STATUS_TONE }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-px text-[12px] font-medium text-ink"
      style={{
        backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)`,
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
