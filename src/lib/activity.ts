import type { RecentComment } from "@/lib/data/activity";

export type ActivityComment = {
  id: string;
  body: string;
  createdAt: Date;
};

export type TaskActivity = {
  taskId: string;
  taskTitle: string;
  comments: ActivityComment[];
  latestAt: Date;
};

export type GroupActivity = {
  groupId: string;
  groupName: string;
  tasks: TaskActivity[];
  latestAt: Date;
};

/**
 * Nests recent comments by group, then by task within each group, so a
 * burst of activity reads as group → task → thread instead of repeating
 * the group and task names on every comment. Comments, tasks and groups
 * are all ordered newest first.
 */
export function nestRecentCommentsByGroup(
  items: RecentComment[],
): GroupActivity[] {
  const groups = new Map<string, GroupActivity>();

  for (const item of items) {
    const comment = { id: item.id, body: item.body, createdAt: item.createdAt };

    let group = groups.get(item.groupId);
    if (!group) {
      group = {
        groupId: item.groupId,
        groupName: item.groupName,
        tasks: [],
        latestAt: comment.createdAt,
      };
      groups.set(item.groupId, group);
    }

    let task = group.tasks.find((t) => t.taskId === item.taskId);
    if (!task) {
      task = {
        taskId: item.taskId,
        taskTitle: item.taskTitle,
        comments: [],
        latestAt: comment.createdAt,
      };
      group.tasks.push(task);
    }

    task.comments.push(comment);
  }

  return [...groups.values()]
    .map((group) => {
      const tasks = group.tasks
        .map((task) => {
          const comments = [...task.comments].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
          return { ...task, comments, latestAt: comments[0].createdAt };
        })
        .sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
      return { ...group, tasks, latestAt: tasks[0].latestAt };
    })
    .sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
}
