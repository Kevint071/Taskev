"use client";

import { type ReactNode, useState } from "react";
import { STATUS_LABELS } from "@/components/project-types";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { FilterIcon, SearchIcon } from "@/components/ui/icons";
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
        <div className="flex flex-col gap-4 pb-2">
          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="px-0.5 text-meta font-semibold text-muted uppercase tracking-wide">
              Estado
            </legend>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                active={filters.status === "todas"}
                onClick={() => onChange({ ...filters, status: "todas" })}
                count={total}
              >
                Todas
              </FilterChip>
              {OPEN_STATUSES.map((status) => (
                <FilterChip
                  key={status}
                  active={filters.status === status}
                  onClick={() => onChange({ ...filters, status })}
                  count={counts[status]}
                  icon={<StatusDot status={status} />}
                >
                  {STATUS_LABELS[status]}
                </FilterChip>
              ))}
            </div>
          </fieldset>

          {projects.length > 1 && (
            <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
              <legend className="px-0.5 text-meta font-semibold text-muted uppercase tracking-wide">
                Proyecto
              </legend>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={filters.projectId === ALL_PROJECTS}
                  onClick={() =>
                    onChange({ ...filters, projectId: ALL_PROJECTS })
                  }
                >
                  Todos
                </FilterChip>
                {projects.map((project) => (
                  <FilterChip
                    key={project.id}
                    active={filters.projectId === project.id}
                    onClick={() =>
                      onChange({ ...filters, projectId: project.id })
                    }
                  >
                    {project.name}
                  </FilterChip>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  count,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border px-3 text-meta font-medium transition-colors ${
        active
          ? "border-accent-soft bg-accent-soft text-accent"
          : "border-line text-ink hover:border-line-strong hover:bg-sunken"
      }`}
    >
      {icon}
      <span className="max-w-40 truncate">{children}</span>
      {count !== undefined && (
        <span
          className={`tabular shrink-0 text-[11px] ${active ? "text-accent/75" : "text-muted"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
