"use client";

import type { ComponentType } from "react";
import { useState } from "react";
import type { GlobalTask } from "@/components/project-types";
import { TaskRow } from "@/components/tasks/task-row";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  MinusIcon,
  TriangleAlertIcon,
} from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import type { BackSource } from "@/lib/back-navigation";
import type { TaskGroupKey } from "@/lib/task-groups";

type GroupConfig = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
};

const GROUPS: Record<TaskGroupKey, GroupConfig> = {
  vencidas: {
    title: "Vencidas",
    icon: TriangleAlertIcon,
    color: "var(--danger)",
  },
  hoy: { title: "Hoy", icon: CalendarIcon, color: "var(--accent)" },
  semana: { title: "Esta semana", icon: CalendarIcon, color: "var(--muted)" },
  despues: {
    title: "Más adelante",
    icon: ArrowRightIcon,
    color: "var(--muted)",
  },
  sinFecha: { title: "Sin fecha", icon: MinusIcon, color: "var(--muted)" },
  completadas: {
    title: "Completadas",
    icon: CheckIcon,
    color: "var(--status-done)",
  },
};

export function TaskGroupSection({
  groupKey,
  tasks,
  now,
  forceOpen = false,
  from,
}: {
  groupKey: TaskGroupKey;
  tasks: GlobalTask[];
  now: Date;
  /** Keeps a collapsible group open, e.g. while a search is active. */
  forceOpen?: boolean;
  from?: BackSource;
}) {
  const cfg = GROUPS[groupKey];
  const Icon = cfg.icon;
  const collapsible = groupKey === "completadas";
  const [expanded, setExpanded] = useState(false);
  const open = !collapsible || expanded || forceOpen;

  const heading = (
    <>
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-control"
        style={{
          backgroundColor: `color-mix(in srgb, ${cfg.color} 14%, transparent)`,
          color: cfg.color,
        }}
      >
        <Icon className="size-3.5" />
      </span>
      {cfg.title}
      <span
        className="tabular text-meta font-medium"
        style={{ color: cfg.color }}
      >
        {tasks.length}
      </span>
    </>
  );

  return (
    <section className="flex min-w-0 flex-col gap-2">
      {collapsible ? (
        <h2>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setExpanded((current) => !current)}
            className="flex min-h-11 w-full items-center gap-2 text-left font-semibold md:min-h-8"
          >
            {heading}
            <ChevronDownIcon
              className={`ml-auto text-muted transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </h2>
      ) : (
        <h2 className="flex items-center gap-2 font-semibold">{heading}</h2>
      )}
      {open && (
        <Panel className="min-w-0 w-full overflow-hidden">
          <ul className="divide-y divide-line">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} now={now} from={from} />
            ))}
          </ul>
        </Panel>
      )}
    </section>
  );
}
