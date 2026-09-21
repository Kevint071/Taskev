import type { ReactNode } from "react";
import { STATUS_LABELS } from "@/components/project-types";
import { ChevronDownIcon, SearchIcon } from "@/components/ui/icons";
import { Input, Select } from "@/components/ui/input";
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
  return (
    <div className="flex flex-col gap-3">
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
        {projects.length > 1 && (
          <div className="relative w-36 shrink-0 sm:w-52">
            <Select
              aria-label="Filtrar por proyecto"
              value={filters.projectId}
              onChange={(e) =>
                onChange({ ...filters, projectId: e.target.value })
              }
              className="w-full truncate"
            >
              <option value={ALL_PROJECTS}>Todos los proyectos</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted" />
          </div>
        )}
      </div>

      <fieldset aria-label="Filtrar por estado" className="m-0 min-w-0 p-0">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
          <Chip
            active={filters.status === "todas"}
            onClick={() => onChange({ ...filters, status: "todas" })}
            count={total}
          >
            Todas
          </Chip>
          {OPEN_STATUSES.filter(
            (status) => counts[status] > 0 || filters.status === status,
          ).map((status) => (
            <Chip
              key={status}
              active={filters.status === status}
              onClick={() => onChange({ ...filters, status })}
              count={counts[status]}
            >
              <StatusDot status={status} />
              {STATUS_LABELS[status]}
            </Chip>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function Chip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-ui font-medium transition-colors ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-line-strong bg-raised text-muted hover:border-ink/30 hover:text-ink"
      }`}
    >
      {children}
      <span className="tabular text-meta opacity-80">{count}</span>
    </button>
  );
}
