import Link from "next/link";
import { STATUS_LABELS } from "@/components/group-types";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  RefreshIcon,
} from "@/components/ui/icons";
import { STATUS_TONE } from "@/components/ui/status-badge";
import {
  type GroupActivity,
  groupTasksByGroup,
  type TaskActivity,
} from "@/lib/activity";
import { taskHref } from "@/lib/back-navigation";
import type { ActivityEvent } from "@/lib/data/activity";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

/** Tasks shown before the remaining groups fold behind "Ver más". */
const VISIBLE_TASKS = 5;
/** Characters of an earlier note shown before it is cut with "…". */
const OLDER_NOTE_MAX_CHARS = 100;

function clip(text: string, max: number): string {
  const chars = Array.from(text.trim());
  return chars.length <= max
    ? chars.join("")
    : `${chars.slice(0, max).join("").trimEnd()}…`;
}

/**
 * Today's activity under one heading per group, each listing the tasks that
 * changed with their latest change inline. Earlier changes fold away to keep
 * the feed short on a phone.
 */
export function ActivityFeed({ tasks }: { tasks: TaskActivity[] }) {
  const changes = tasks.reduce((sum, t) => sum + t.events.length, 0);
  const { visible, hidden, hiddenTasks } = splitGroups(
    groupTasksByGroup(tasks),
  );

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-control bg-sunken text-muted">
            <RefreshIcon className="size-3.5" />
          </span>
          Actividad de hoy
        </h2>
        <span className="tabular shrink-0 text-meta text-muted">
          {changes} {changes === 1 ? "cambio" : "cambios"}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {visible.map((group) => (
          <GroupBlock key={group.groupId} group={group} />
        ))}
      </div>

      {hidden.length > 0 && (
        <details className="group/more">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center gap-1.5 rounded-panel border border-dashed border-line-strong text-meta font-medium text-muted transition-colors hover:border-muted hover:text-ink group-open/more:mb-4 [&::-webkit-details-marker]:hidden">
            <span className="group-open/more:hidden">
              Ver {hiddenTasks} {hiddenTasks === 1 ? "tarea" : "tareas"} más
            </span>
            <span className="hidden group-open/more:inline">Ver menos</span>
            <ChevronDownIcon className="size-3.5 transition-transform group-open/more:rotate-180" />
          </summary>
          <div className="flex min-w-0 flex-col gap-4">
            {hidden.map((group) => (
              <GroupBlock key={group.groupId} group={group} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

/** Whole groups until `VISIBLE_TASKS` tasks are shown; the rest fold away. */
function splitGroups(groups: GroupActivity[]) {
  let shown = 0;
  const visible: GroupActivity[] = [];
  const hidden: GroupActivity[] = [];
  for (const group of groups) {
    if (visible.length === 0 || shown < VISIBLE_TASKS) {
      visible.push(group);
      shown += group.tasks.length;
    } else {
      hidden.push(group);
    }
  }
  const hiddenTasks = hidden.reduce((sum, g) => sum + g.tasks.length, 0);
  return { visible, hidden, hiddenTasks };
}

function GroupBlock({ group }: { group: GroupActivity }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {/* A quiet label with a hairline, so it reads below the section title. */}
      <h3 className="flex min-w-0 items-center gap-3 px-0.5">
        <span className="min-w-0 truncate text-meta font-medium text-muted">
          {group.groupName}
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </h3>
      <ul className="min-w-0 divide-y divide-line overflow-hidden rounded-panel border border-line bg-raised shadow-panel">
        {group.tasks.map((task) => (
          <TaskRow key={task.taskId} task={task} />
        ))}
      </ul>
    </div>
  );
}

function TaskRow({ task }: { task: TaskActivity }) {
  const [latest, ...older] = task.events;

  return (
    <li className="relative min-w-0 py-2.5 pr-3.5 pl-4 transition-colors hover:bg-sunken">
      <span
        aria-hidden="true"
        className="absolute inset-y-1.5 left-0 w-[3px] rounded-full"
        style={{ backgroundColor: eventTone(latest) }}
      />

      <div className="flex min-w-0 items-baseline justify-between gap-3">
        {/* The ::after stretches the link over the row; the folded
            history sits above it so its toggle stays clickable. */}
        <Link
          href={taskHref(task.groupId, task.taskId, "hoy")}
          className="min-w-0 truncate font-medium after:absolute after:inset-0"
        >
          {task.taskTitle}
        </Link>
        <EventTime event={latest} />
      </div>

      <div className="mt-0.5 text-meta text-muted">
        <EventSummary event={latest} />
      </div>
      {latest.type === "comment_added" && latest.body && (
        <NoteText body={latest.body} />
      )}

      {older.length > 0 && (
        <details className="group/history relative z-10">
          <summary className="mt-1 inline-flex min-h-7 cursor-pointer list-none items-center gap-1 rounded-control text-[12px] font-medium text-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
            {older.length}{" "}
            {older.length === 1 ? "cambio anterior" : "cambios anteriores"}
            <ChevronDownIcon className="size-3 transition-transform group-open/history:rotate-180" />
          </summary>
          <ol className="flex flex-col divide-y divide-line border-t border-line">
            {older.map((event) => (
              <li
                key={event.id}
                className="flex min-w-0 items-baseline justify-between gap-3 py-1.5 text-meta text-muted"
              >
                {event.type === "comment_added" ? (
                  // Quiet context, not the headline: it may wrap, but only
                  // up to OLDER_NOTE_MAX_CHARS characters.
                  <p className="min-w-0 flex-1 break-words">
                    <span className="font-medium text-ink">Nueva nota</span>
                    {event.body &&
                      ` · ${clip(event.body, OLDER_NOTE_MAX_CHARS)}`}
                  </p>
                ) : (
                  <EventSummary event={event} />
                )}
                <EventTime event={event} />
              </li>
            ))}
          </ol>
        </details>
      )}
    </li>
  );
}

function EventTime({ event }: { event: ActivityEvent }) {
  return (
    <time
      dateTime={event.createdAt.toISOString()}
      title={formatDateTime(event.createdAt.toISOString())}
      className="tabular shrink-0 whitespace-nowrap text-[12px] text-muted"
    >
      {formatRelativeTime(event.createdAt)}
    </time>
  );
}

function NoteText({ body }: { body: string }) {
  return (
    <p className="mt-1 line-clamp-2 break-words border-l-2 border-line-strong pl-2 text-meta text-ink">
      {body}
    </p>
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-px text-[12px] font-medium ${muted ? "text-muted" : "text-ink"}`}
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
