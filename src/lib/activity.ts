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
