"use client";

import { useEffect, useState } from "react";
import type { GlobalTask } from "@/components/group-types";
import { TaskBucketSection } from "@/components/tasks/task-bucket-section";
import { TaskToolbar } from "@/components/tasks/task-toolbar";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, LoadingRows, PageHeader } from "@/components/ui/panel";
import { handleUnauthenticated } from "@/lib/api-client";
import {
  ALL_GROUPS,
  buildTaskBuckets,
  countByStatus,
  filterTasks,
  type TaskFilters,
} from "@/lib/task-buckets";

const NO_FILTERS: TaskFilters = {
  query: "",
  status: "todas",
  groupId: ALL_GROUPS,
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
  const buckets = buildTaskBuckets(
    tasks ? filterTasks(tasks, filters) : [],
    now,
  );
  const overdueCount = tasks
    ? (buildTaskBuckets(tasks, now).find((g) => g.key === "vencidas")?.tasks
        .length ?? 0)
    : 0;
  const groups = tasks
    ? [...new Map(tasks.map((t) => [t.groupId, t.groupName]))]
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
          description="Las tareas viven dentro de un grupo. Crea uno y añade la primera."
          action={
            <ButtonLink href="/groups" variant="primary">
              Ir a grupos
            </ButtonLink>
          }
        />
      ) : (
        <>
          <TaskToolbar
            filters={filters}
            onChange={setFilters}
            groups={groups}
            counts={countByStatus(scoped)}
          />
          {buckets.length === 0 ? (
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
              {buckets.map((bucket) => (
                <TaskBucketSection
                  key={bucket.key}
                  bucketKey={bucket.key}
                  tasks={bucket.tasks}
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
