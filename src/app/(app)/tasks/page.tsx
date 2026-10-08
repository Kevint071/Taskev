"use client";

import { useEffect, useState } from "react";
import type { GlobalTask } from "@/components/group-types";
import {
  type TaskTabItem,
  TaskViewTabs,
} from "@/components/groups/group-task-tabs";
import {
  GLOBAL_TASK_TABS_PREFIX,
  GlobalTaskList,
  type GlobalTaskView,
} from "@/components/tasks/global-task-list";
import { GlobalTasksSkeleton } from "@/components/tasks/global-tasks-skeleton";
import { TaskToolbar } from "@/components/tasks/task-toolbar";
import { Button, ButtonLink } from "@/components/ui/button";
import { CalendarIcon, CheckIcon } from "@/components/ui/icons";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { handleUnauthenticated } from "@/lib/api-client";
import {
  ALL_GROUPS,
  buildTaskBuckets,
  countByStatus,
  filterTasks,
  type TaskFilters,
} from "@/lib/task-buckets";
import {
  loadTaskFilters,
  NO_FILTERS,
  saveTaskFilters,
} from "@/lib/task-filters-storage";

const VIEW_TABS: TaskTabItem<GlobalTaskView>[] = [
  {
    value: "sin_completar",
    label: "Sin completar",
    icon: CalendarIcon,
    color: "var(--accent)",
  },
  {
    value: "completadas",
    label: "Completadas",
    icon: CheckIcon,
    color: "var(--status-done)",
  },
];

export default function GlobalTasksPage() {
  const [tasks, setTasks] = useState<GlobalTask[] | null>(null);
  // Restored from the session so filters survive opening a task and coming back.
  // Safe for hydration: nothing filter-dependent renders until `tasks` loads.
  const [filters, setFilters] = useState<TaskFilters>(loadTaskFilters);
  const [view, setView] = useState<GlobalTaskView>("sin_completar");
  const [now] = useState(() => new Date());

  useEffect(() => {
    saveTaskFilters(filters);
  }, [filters]);

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
  const filtering =
    filters.query.trim() !== "" ||
    filters.status !== "todas" ||
    filters.groupId !== ALL_GROUPS;
  // Overdue, today and upcoming keep their urgency order inside "sin completar".
  const byView: Record<GlobalTaskView, GlobalTask[]> = {
    sin_completar: buckets
      .filter((bucket) => bucket.key !== "completadas")
      .flatMap((bucket) => bucket.tasks),
    completadas:
      buckets.find((bucket) => bucket.key === "completadas")?.tasks ?? [],
  };

  // First load: one skeleton for the whole page, so nothing shows ahead of the rest.
  if (tasks === null) return <GlobalTasksSkeleton />;

  return (
    <>
      <PageHeader
        title="Tareas"
        description={`${tasks.length} tarea${tasks.length === 1 ? "" : "s"}${
          overdueCount > 0
            ? `, ${overdueCount} vencida${overdueCount === 1 ? "" : "s"}`
            : ""
        }`}
      />

      {tasks.length === 0 ? (
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
        <div className="flex flex-col gap-4 md:gap-5">
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
            <>
              <TaskViewTabs
                items={VIEW_TABS}
                idPrefix={GLOBAL_TASK_TABS_PREFIX}
                ariaLabel="Filtrar tareas"
                active={view}
                counts={{
                  sin_completar: byView.sin_completar.length,
                  completadas: byView.completadas.length,
                }}
                onChange={setView}
              />
              <GlobalTaskList
                view={view}
                tasks={byView[view]}
                now={now}
                from="tasks"
                onClearFilters={
                  filtering ? () => setFilters(NO_FILTERS) : undefined
                }
              />
            </>
          )}
        </div>
      )}
    </>
  );
}
