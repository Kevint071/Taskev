import Link from "next/link";
import { notFound } from "next/navigation";
import type { Task } from "@/components/project-types";
import { getCurrentUser } from "@/lib/auth-guard";
import { getTaskWithProject } from "@/lib/data/access";
import { TaskDetailPageClient } from "./task-detail-page-client";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id, taskId } = await params;
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
    createdAt: dbTask.createdAt.toISOString(),
    updatedAt: dbTask.updatedAt.toISOString(),
  };

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/projects/${project.id}`}
        className="w-fit text-meta text-muted hover:text-ink"
      >
        ← {project.name}
      </Link>
      <TaskDetailPageClient initialTask={task} />
    </div>
  );
}
