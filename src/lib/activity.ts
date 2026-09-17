import type { RecentComment } from "@/lib/data/activity";

export type ActivityComment = {
  id: string;
  body: string;
  createdAt: Date;
};

export type TaskActivityGroup = {
  taskId: string;
  taskTitle: string;
  comments: ActivityComment[];
  latestAt: Date;
};

export type ProjectActivityGroup = {
  projectId: string;
  projectName: string;
  tasks: TaskActivityGroup[];
  latestAt: Date;
};

/**
 * Groups recent comments by project, then by task within each project, so a
 * burst of activity reads as project → task → thread instead of repeating
 * the project and task names on every comment. Comments, tasks and projects
 * are all ordered newest first.
 */
export function groupRecentCommentsByProject(
  items: RecentComment[],
): ProjectActivityGroup[] {
  const projects = new Map<string, ProjectActivityGroup>();

  for (const item of items) {
    const comment = { id: item.id, body: item.body, createdAt: item.createdAt };

    let project = projects.get(item.projectId);
    if (!project) {
      project = {
        projectId: item.projectId,
        projectName: item.projectName,
        tasks: [],
        latestAt: comment.createdAt,
      };
      projects.set(item.projectId, project);
    }

    let task = project.tasks.find((t) => t.taskId === item.taskId);
    if (!task) {
      task = {
        taskId: item.taskId,
        taskTitle: item.taskTitle,
        comments: [],
        latestAt: comment.createdAt,
      };
      project.tasks.push(task);
    }

    task.comments.push(comment);
  }

  return [...projects.values()]
    .map((project) => {
      const tasks = project.tasks
        .map((task) => {
          const comments = [...task.comments].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
          return { ...task, comments, latestAt: comments[0].createdAt };
        })
        .sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
      return { ...project, tasks, latestAt: tasks[0].latestAt };
    })
    .sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
}
