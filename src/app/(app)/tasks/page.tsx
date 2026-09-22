"use client";

import { useEffect, useState } from "react";
import type { GlobalTask } from "@/components/project-types";
import { TaskGroupSection } from "@/components/tasks/task-group-section";
import { TaskToolbar } from "@/components/tasks/task-toolbar";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, LoadingRows, PageHeader } from "@/components/ui/panel";
import { handleUnauthenticated } from "@/lib/api-client";
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

export default function GlobalTasksPage() {
  const [tasks, setTasks] = useState<GlobalTask[] | null>(null);
  const [filters, setFilters] = useState<TaskFilters>(NO_FILTERS);
  const [now] = useState(() => new Date());

  useEffect(() => {
    fetch("/api/tasks").then(async (res) => {
      if (handleUnauthenticated(res)) return;
      setTasks(await res.json());
    });
  }, []);

  const scoped = tasks
    ? filterTasks(tasks, { ...filters, status: "todas" })
    : [];
  const groups = buildTaskGroups(tasks ? filterTasks(tasks, filters) : [], now);
  const overdueCount = tasks
    ? (buildTaskGroups(tasks, now).find((g) => g.key === "vencidas")?.tasks
        .length ?? 0)
    : 0;
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
        description={
          tasks
            ? `${tasks.length} tarea${tasks.length === 1 ? "" : "s"}${
                overdueCount > 0
                  ? ` · ${overdueCount} vencida${overdueCount === 1 ? "" : "s"}`
                  : ""
              }`
            : undefined
        }
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
                  forceOpen={searching}
                  from="tasks"
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
