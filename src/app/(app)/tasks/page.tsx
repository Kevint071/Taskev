"use client";

import { useCallback, useEffect, useState } from "react";
import type { GlobalTask } from "@/components/project-types";
import { TaskGroupSection } from "@/components/tasks/task-group-section";
import { TaskToolbar } from "@/components/tasks/task-toolbar";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, LoadingRows, PageHeader } from "@/components/ui/panel";
import { Toast, type ToastState } from "@/components/ui/toast";
import { handleUnauthenticated } from "@/lib/api-client";
import { todayUtcMidnight } from "@/lib/calendar";
import {
  ALL_PROJECTS,
  buildTaskGroups,
  countByStatus,
  filterTasks,
  type TaskFilters,
} from "@/lib/task-groups";

const NO_FILTERS: TaskFilters = {
  query: "",
  status: "todas",
  projectId: ALL_PROJECTS,
};

type TaskPatch = Partial<
  Pick<GlobalTask, "status" | "progressPct" | "completedAt">
>;

export default function GlobalTasksPage() {
  const [tasks, setTasks] = useState<GlobalTask[] | null>(null);
  const [filters, setFilters] = useState<TaskFilters>(NO_FILTERS);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastState>(null);
  const [now] = useState(() => new Date());
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    fetch("/api/tasks").then(async (res) => {
      if (handleUnauthenticated(res)) return;
      setTasks(await res.json());
    });
  }, []);

  function replaceTask(id: string, apply: (task: GlobalTask) => GlobalTask) {
    setTasks(
      (current) => current?.map((t) => (t.id === id ? apply(t) : t)) ?? null,
    );
  }

  async function toggleDone(task: GlobalTask) {
    const completing = task.status !== "completada";
    const patch: TaskPatch = completing
      ? {
          status: "completada",
          progressPct: 100,
          completedAt: todayUtcMidnight().toISOString(),
        }
      : { status: "en_curso", completedAt: null };

    setPendingIds((ids) => new Set(ids).add(task.id));
    replaceTask(task.id, (t) => ({
      ...t,
      ...patch,
      blocked: false,
      relevance: completing ? null : t.relevance,
    }));

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (handleUnauthenticated(res)) return;
      if (!res.ok) throw new Error(`PATCH ${res.status}`);
    } catch {
      replaceTask(task.id, () => task);
      setToast({ id: Date.now(), message: "No se pudo actualizar la tarea" });
    } finally {
      setPendingIds((ids) => {
        const next = new Set(ids);
        next.delete(task.id);
        return next;
      });
    }
  }

  const scoped = tasks
    ? filterTasks(tasks, { ...filters, status: "todas" })
    : [];
  const groups = buildTaskGroups(tasks ? filterTasks(tasks, filters) : [], now);
  const projects = tasks
    ? [...new Map(tasks.map((t) => [t.projectId, t.projectName]))]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
    : [];
  const searching = filters.query.trim() !== "";

  return (
    <>
      <PageHeader
        title="Tareas"
        description="Todo lo que tienes entre manos, agrupado por urgencia."
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
          <TaskToolbar
            filters={filters}
            onChange={setFilters}
            projects={projects}
            counts={countByStatus(scoped)}
            total={scoped.length}
          />
          {groups.length === 0 ? (
            <EmptyState
              title="Ninguna tarea coincide"
              description="Prueba con otra búsqueda o quita algún filtro."
              action={
                <Button
                  variant="secondary"
                  onClick={() => setFilters(NO_FILTERS)}
                >
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map((group) => (
                <TaskGroupSection
                  key={group.key}
                  groupKey={group.key}
                  tasks={group.tasks}
                  now={now}
                  pendingIds={pendingIds}
                  onToggle={toggleDone}
                  forceOpen={searching}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
