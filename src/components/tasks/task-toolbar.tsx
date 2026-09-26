"use client";

import { type ReactNode, useState } from "react";
import { STATUS_LABELS } from "@/components/group-types";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { CheckIcon, FilterIcon, SearchIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
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
  const filtered = filters.status !== "todas" || filters.groupId !== ALL_GROUPS;

  return (
    <div className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          aria-label="Buscar tareas"
          placeholder="Buscar tarea o grupo"
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
        <legend className="mb-1 px-2.5 text-[11px] leading-4 font-semibold tracking-wider text-muted uppercase">
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
