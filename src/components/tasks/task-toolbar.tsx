"use client";

import { type ReactNode, useState } from "react";
import { STATUS_LABELS } from "@/components/group-types";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  CheckIcon,
  CloseIcon,
  FilterIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { StatusDot } from "@/components/ui/status-badge";
import {
  ALL_GROUPS,
  OPEN_STATUSES,
  type OpenStatus,
  type TaskFilters,
} from "@/lib/task-buckets";

export function TaskToolbar({
  filters,
  onChange,
  groups,
  counts,
}: {
  filters: TaskFilters;
  onChange: (next: TaskFilters) => void;
  groups: { id: string; name: string }[];
  counts: Record<OpenStatus, number>;
}) {
  const [open, setOpen] = useState(false);
  const groupName = groups.find((g) => g.id === filters.groupId)?.name;
  const active: { key: string; label: string; clear: () => void }[] = [];
  if (filters.status !== "todas") {
    active.push({
      key: "status",
      label: STATUS_LABELS[filters.status],
      clear: () => onChange({ ...filters, status: "todas" }),
    });
  }
  if (filters.groupId !== ALL_GROUPS) {
    active.push({
      key: "group",
      label: groupName ?? "Grupo",
      clear: () => onChange({ ...filters, groupId: ALL_GROUPS }),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            aria-label="Buscar tareas"
            placeholder="Buscar tarea o grupo"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            className="h-11 w-full rounded-xl border border-control bg-raised pr-10 pl-10 text-ui text-ink shadow-panel transition-[color,background-color,border-color,box-shadow] placeholder:text-muted hover:border-ink/40 focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)] [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.query !== "" && (
            <button
              type="button"
              aria-label="Borrar búsqueda"
              onClick={() => onChange({ ...filters, query: "" })}
              className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              <CloseIcon className="size-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3.5 text-ui font-medium whitespace-nowrap shadow-panel transition-colors ${
            active.length > 0
              ? "border-accent/40 bg-accent-soft text-accent hover:border-accent"
              : "border-control bg-raised text-ink hover:border-ink/40 hover:bg-sunken"
          }`}
        >
          <FilterIcon />
          Filtrar
          {active.length > 0 && (
            <span className="tabular flex size-5 items-center justify-center rounded-full bg-accent text-[0.75rem] font-semibold text-accent-ink">
              {active.length}
            </span>
          )}
        </button>
      </div>

      {active.length > 0 && (
        <ul
          aria-label="Filtros activos"
          className="flex flex-wrap items-center gap-2"
        >
          {active.map((filter) => (
            <li key={filter.key}>
              <button
                type="button"
                aria-label={`Quitar filtro: ${filter.label}`}
                onClick={filter.clear}
                className="inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-accent-soft pr-1.5 pl-3 text-meta font-medium text-accent transition-colors hover:bg-accent/15"
              >
                <span className="truncate">{filter.label}</span>
                <CloseIcon className="size-3.5 shrink-0" />
              </button>
            </li>
          ))}
          {active.length > 1 && (
            <li>
              <button
                type="button"
                onClick={() =>
                  onChange({ ...filters, status: "todas", groupId: ALL_GROUPS })
                }
                className="h-7 rounded-full px-2 text-meta font-medium text-muted transition-colors hover:text-ink"
              >
                Limpiar
              </button>
            </li>
          )}
        </ul>
      )}

      <BottomSheet
        open={open}
        title="Filtrar tareas"
        onClose={() => setOpen(false)}
      >
        <div className="flex flex-col gap-3 pb-1">
          <FilterSection label="Estado">
            {OPEN_STATUSES.map((status) => (
              <FilterOption
                key={status}
                active={filters.status === status}
                onClick={() =>
                  onChange({
                    ...filters,
                    status: filters.status === status ? "todas" : status,
                  })
                }
                count={counts[status]}
                icon={<StatusDot status={status} />}
              >
                {STATUS_LABELS[status]}
              </FilterOption>
            ))}
          </FilterSection>

          {groups.length > 1 && (
            <FilterSection label="Grupo" divided>
              {groups.map((group) => (
                <FilterOption
                  key={group.id}
                  active={filters.groupId === group.id}
                  onClick={() =>
                    onChange({
                      ...filters,
                      groupId:
                        filters.groupId === group.id ? ALL_GROUPS : group.id,
                    })
                  }
                >
                  {group.name}
                </FilterOption>
              ))}
            </FilterSection>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

function FilterSection({
  label,
  divided = false,
  children,
}: {
  label: string;
  divided?: boolean;
  children: ReactNode;
}) {
  // The divider sits on a wrapper: a fieldset draws its legend over its own top border.
  return (
    <div className={divided ? "border-t border-line pt-3" : undefined}>
      <fieldset className="m-0 flex min-w-0 flex-col gap-px border-0 p-0">
        <legend className="mb-1 px-2.5 text-[0.75rem] leading-4 font-semibold tracking-wider text-muted uppercase">
          {label}
        </legend>
        {children}
      </fieldset>
    </div>
  );
}

function FilterOption({
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
      className={`flex h-9 w-full items-center gap-2 rounded-xl px-2.5 text-left text-ui transition-colors ${
        active
          ? "bg-accent-soft font-semibold text-accent"
          : "font-medium text-ink hover:bg-sunken"
      }`}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count !== undefined && (
        <span
          className={`tabular text-meta font-medium ${active ? "text-accent/80" : "text-muted"}`}
        >
          {count}
        </span>
      )}
      {/* Reserved even when inactive so counts stay in one column. */}
      <CheckIcon className={active ? "" : "invisible"} />
    </button>
  );
}
