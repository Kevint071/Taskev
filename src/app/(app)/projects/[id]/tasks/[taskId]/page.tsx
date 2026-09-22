import { notFound } from "next/navigation";
import type { Task } from "@/components/project-types";
import { getCurrentUser } from "@/lib/auth-guard";
import { resolveBack } from "@/lib/back-navigation";
import { getTaskWithProject } from "@/lib/data/access";
import { TaskDetailPageClient } from "./task-detail-page-client";

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; taskId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { id, taskId } = await params;
  const { from } = await searchParams;
  const user = await getCurrentUser();
  if (!user) notFound();

  const row = await getTaskWithProject(taskId);
  if (!row || row.project.userId !== user.id || row.project.id !== id) {
    notFound();
  }

  const { task: dbTask, project } = row;
  const task: Task = {
    id: dbTask.id,
    projectId: dbTask.projectId,
    title: dbTask.title,
    description: dbTask.description,
    status: dbTask.status,
    progressPct: dbTask.progressPct,
    priority: dbTask.priority,
    dueDate: dbTask.dueDate ? dbTask.dueDate.toISOString() : null,
    completedAt: dbTask.completedAt ? dbTask.completedAt.toISOString() : null,
    position: dbTask.position,
    pinnedToday: dbTask.pinnedToday,
    createdAt: dbTask.createdAt.toISOString(),
    updatedAt: dbTask.updatedAt.toISOString(),
  };

  return (
    <div className="flex flex-1 flex-col">
      <TaskDetailPageClient
        initialTask={task}
        back={resolveBack(from, project)}
      />
    </div>
  );
}
