"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type GlobalTask, STATUS_LABELS } from "@/components/project-types";
import { ButtonLink } from "@/components/ui/button";
import {
  EmptyState,
  LoadingRows,
  PageHeader,
  Panel,
} from "@/components/ui/panel";
import { ProgressChip } from "@/components/ui/progress-chip";
import { StatusDot } from "@/components/ui/status-badge";
import { handleUnauthenticated } from "@/lib/api-client";
import { formatDueDate, isOverdue } from "@/lib/format";

export default function GlobalTasksPage() {
  const [tasks, setTasks] = useState<GlobalTask[] | null>(null);

  useEffect(() => {
    fetch("/api/tasks").then(async (res) => {
      if (handleUnauthenticated(res)) return;
      setTasks(await res.json());
    });
  }, []);

  const active = tasks?.filter((t) => t.status !== "completada") ?? [];
  const completed = tasks?.filter((t) => t.status === "completada") ?? [];

  return (
    <>
      <PageHeader
        title="Tareas"
        description="Todas tus tareas activas, ordenadas por relevancia: prioridad más urgencia por fecha límite."
      />

      {tasks === null ? (
        <LoadingRows rows={5} />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="Todavía no tienes tareas"
          description="Las tareas viven dentro de un proyecto. Crea uno y añade la primera."
          action={
            <ButtonLink href="/projects" variant="primary">
              Ir a proyectos
            </ButtonLink>
          }
        />
      ) : (
        <>
          {active.length > 0 && <TaskList tasks={active} ranked />}
          {completed.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-meta font-medium text-muted">
                Completadas{" "}
                <span className="tabular">({completed.length})</span>
              </h2>
              <div className="opacity-70">
                <TaskList tasks={completed} />
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

function TaskList({
  tasks,
  ranked = false,
}: {
  tasks: GlobalTask[];
  ranked?: boolean;
}) {
  return (
    <Panel>
      <ol className="divide-y divide-line">
        {tasks.map((task, index) => {
          const done = task.status === "completada";
          const overdue = !done && task.dueDate && isOverdue(task.dueDate);
          return (
            <li key={task.id}>
              <Link
                href={`/projects/${task.projectId}`}
                className={`flex items-center gap-3 px-4 py-2.5 transition-colors first:rounded-t-panel last:rounded-b-panel hover:bg-sunken ${
                  task.blocked
                    ? "shadow-[inset_3px_0_0_var(--status-blocked)]"
                    : ""
                }`}
              >
                {ranked && (
                  <span className="tabular w-5 shrink-0 text-right text-meta text-muted">
                    {index + 1}
                  </span>
                )}
                <span
                  className={`min-w-0 flex-1 truncate font-medium text-body sm:text-ui ${done ? "line-through decoration-line-strong" : ""}`}
                >
                  {task.title}
                </span>
                <span className="shrink-0 text-meta text-muted/60">·</span>
                <span className="shrink-0 truncate max-w-[8rem] text-meta text-muted">
                  {task.projectName}
                </span>
                <span className="shrink-0" title={STATUS_LABELS[task.status]}>
                  <StatusDot status={task.status} />
                </span>
                <span className="shrink-0 hidden sm:inline tabular text-meta text-muted">
                  P{Number(task.priority)}
                </span>
                {task.dueDate && (
                  <span
                    className={`shrink-0 tabular text-meta ${overdue ? "font-medium text-danger" : "text-muted"}`}
                  >
                    {formatDueDate(task.dueDate)}
                  </span>
                )}
                <ProgressChip value={task.progressPct} />
              </Link>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
