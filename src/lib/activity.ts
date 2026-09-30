import type { ActivityEvent } from "@/lib/data/activity";

export type TaskActivity = {
  taskId: string;
  taskTitle: string;
  groupId: string;
  groupName: string;
  /** Newest first. */
  events: ActivityEvent[];
  latestAt: Date;
};

/**
 * Groups audit events by task so a burst of activity reads as one entry per
 * task instead of repeating the task name on every event. Events within a
 * task and tasks themselves are ordered newest first.
 */
export function groupEventsByTask(events: ActivityEvent[]): TaskActivity[] {
  const byTask = new Map<string, ActivityEvent[]>();
  for (const item of events) {
    const list = byTask.get(item.taskId);
    if (list) list.push(item);
    else byTask.set(item.taskId, [item]);
  }

  return [...byTask.values()]
    .map((list) => {
      const sorted = [...list].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      const { taskId, taskTitle, groupId, groupName } = sorted[0];
      return {
        taskId,
        taskTitle,
        groupId,
        groupName,
        events: sorted,
        latestAt: sorted[0].createdAt,
      };
    })
    .sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
}

export type GroupActivity = {
  groupId: string;
  groupName: string;
  /** Newest first. */
  tasks: TaskActivity[];
  latestAt: Date;
};

/**
 * Nests tasks under their group so the feed names each group once instead of
 * on every task. Expects `tasks` newest first (as `groupEventsByTask` returns
 * them); groups are ordered by their most recent task.
 */
export function groupTasksByGroup(tasks: TaskActivity[]): GroupActivity[] {
  const byGroup = new Map<string, GroupActivity>();
  for (const task of tasks) {
    const group = byGroup.get(task.groupId);
    if (group) group.tasks.push(task);
    else {
      byGroup.set(task.groupId, {
        groupId: task.groupId,
        groupName: task.groupName,
        tasks: [task],
        latestAt: task.latestAt,
      });
    }
  }

  return [...byGroup.values()].sort(
    (a, b) => b.latestAt.getTime() - a.latestAt.getTime(),
  );
}

export type ActivitySummary = {
  changes: number;
  /** Distinct tasks that changed. */
  tasks: number;
  created: number;
  /** Status changes that closed a task. */
  completed: number;
  /** Any other status change. */
  statusChanges: number;
  notes: number;
};

export type ActivityKind = "completed" | "created" | "statusChanges" | "notes";

/** Which bucket of the day's summary an event counts towards. */
export function activityKind(
  event: Pick<ActivityEvent, "type" | "toStatus">,
): ActivityKind {
  if (event.type === "task_created") return "created";
  if (event.type === "comment_added") return "notes";
  return event.toStatus === "completada" ? "completed" : "statusChanges";
}

/** What happened in a batch of events, for the headline of the activity page. */
export function summarizeActivity(events: ActivityEvent[]): ActivitySummary {
  const summary: ActivitySummary = {
    changes: events.length,
    tasks: new Set(events.map((e) => e.taskId)).size,
    created: 0,
    completed: 0,
    statusChanges: 0,
    notes: 0,
  };
  for (const event of events) summary[activityKind(event)]++;
  return summary;
}

export type HourActivity = {
  /** Hour of the day, 0-23. */
  hour: number;
  counts: Record<ActivityKind, number>;
  total: number;
};

/** Fewest hours the hourly chart shows, so a single event doesn't fill it. */
const MIN_CHART_HOURS = 6;

function hourOf(date: Date, timeZone?: string): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone,
  })
    .formatToParts(date)
    .find((p) => p.type === "hour")?.value;
  return Number(hour);
}

/**
 * Today's events bucketed by hour of day in `timeZone` (the process's zone when
 * omitted). The window runs from the first active hour (or `MIN_CHART_HOURS`
 * back, whichever is earlier, never before midnight) to the current hour, with
 * empty hours included so the gaps in the day show.
 */
export function hourlyActivity(
  events: { at: Date; kind: ActivityKind }[],
  now: Date,
  timeZone?: string,
): HourActivity[] {
  const end = hourOf(now, timeZone);
  const hours = events.map((e) => hourOf(e.at, timeZone));
  const start = Math.max(0, Math.min(end - (MIN_CHART_HOURS - 1), ...hours));

  const buckets: HourActivity[] = [];
  for (let hour = start; hour <= end; hour++) {
    buckets.push({
      hour,
      counts: { completed: 0, created: 0, statusChanges: 0, notes: 0 },
      total: 0,
    });
  }
  events.forEach((e, i) => {
    const bucket = buckets[hours[i] - start];
    if (!bucket) return; // Later than `now`'s hour: clock skew, not plotted.
    bucket.counts[e.kind]++;
    bucket.total++;
  });
  return buckets;
}
