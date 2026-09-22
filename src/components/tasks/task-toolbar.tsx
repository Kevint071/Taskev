"use client";

import { type ReactNode, useState } from "react";
import { STATUS_LABELS } from "@/components/project-types";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { CheckIcon, FilterIcon, SearchIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { StatusDot } from "@/components/ui/status-badge";
import {
  ALL_PROJECTS,
  OPEN_STATUSES,
  type OpenStatus,
  type TaskFilters,
} from "@/lib/task-groups";

export function TaskToolbar({
  filters,
  onChange,
  projects,
  counts,
  total,
}: {
  filters: TaskFilters;
  onChange: (next: TaskFilters) => void;
  projects: { id: string; name: string }[];
  counts: Record<OpenStatus, number>;
  total: number;
}) {
  const [open, setOpen] = useState(false);
  const filtered =
    filters.status !== "todas" || filters.projectId !== ALL_PROJECTS;

  return (
    <div className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          aria-label="Buscar tareas"
          placeholder="Buscar tarea o proyecto"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          className="w-full pl-9"
        />
      </div>

      <div className="relative shrink-0">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <FilterIcon />
          Filtrar
        </Button>
        {filtered && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 size-2.5 rounded-full bg-accent"
          />
        )}
      </div>

      <BottomSheet
        open={open}
        title="Filtrar tareas"
        onClose={() => setOpen(false)}
      >
        <div className="flex flex-col gap-5 pb-2">
          <fieldset className="m-0 flex min-w-0 flex-col gap-0.5 border-0 p-0">
            <legend className="px-1 pb-1 text-meta font-semibold text-muted uppercase tracking-wide">
              Estado
            </legend>
            <FilterOption
              active={filters.status === "todas"}
              onClick={() => onChange({ ...filters, status: "todas" })}
              count={total}
            >
              Todas
            </FilterOption>
            {OPEN_STATUSES.map((status) => (
              <FilterOption
                key={status}
                active={filters.status === status}
                onClick={() => onChange({ ...filters, status })}
                count={counts[status]}
              >
                <StatusDot status={status} />
                {STATUS_LABELS[status]}
              </FilterOption>
            ))}
          </fieldset>

          {projects.length > 1 && (
            <fieldset className="m-0 flex min-w-0 flex-col gap-0.5 border-0 p-0">
              <legend className="px-1 pb-1 text-meta font-semibold text-muted uppercase tracking-wide">
                Proyecto
              </legend>
              <FilterOption
                active={filters.projectId === ALL_PROJECTS}
                onClick={() =>
                  onChange({ ...filters, projectId: ALL_PROJECTS })
                }
              >
                Todos
              </FilterOption>
              {projects.map((project) => (
                <FilterOption
                  key={project.id}
                  active={filters.projectId === project.id}
                  onClick={() =>
                    onChange({ ...filters, projectId: project.id })
                  }
                >
                  {project.name}
                </FilterOption>
              ))}
            </fieldset>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

function FilterOption({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-11 items-center gap-2.5 rounded-2xl px-3 text-left transition-colors ${
        active ? "bg-accent-soft text-accent" : "hover:bg-sunken"
      }`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[15px] font-medium">
        {children}
      </span>
      {count !== undefined && (
        <span className="tabular text-meta opacity-80">{count}</span>
      )}
      {active && <CheckIcon className="shrink-0" />}
    </button>
  );
}
