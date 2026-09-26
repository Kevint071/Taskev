"use client";

import type { ComponentType } from "react";
import { useState } from "react";
import type { GlobalTask } from "@/components/group-types";
import { TaskRow } from "@/components/tasks/task-row";
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  TriangleAlertIcon,
} from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import type { BackSource } from "@/lib/back-navigation";
import type { TaskBucketKey } from "@/lib/task-buckets";

type BucketConfig = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
};

const BUCKETS: Record<TaskBucketKey, BucketConfig> = {
  vencidas: {
    title: "Vencidas",
    icon: TriangleAlertIcon,
    color: "var(--danger)",
  },
  hoy: { title: "Hoy", icon: CalendarIcon, color: "var(--accent)" },
  proximas: { title: "Próximas", icon: CalendarIcon, color: "var(--muted)" },
  completadas: {
    title: "Completadas",
    icon: CheckIcon,
    color: "var(--status-done)",
  },
};

export function TaskBucketSection({
  bucketKey,
  tasks,
  now,
  forceOpen = false,
  from,
}: {
  bucketKey: TaskBucketKey;
  tasks: GlobalTask[];
  now: Date;
  /** Keeps a collapsible bucket open, e.g. while a search is active. */
  forceOpen?: boolean;
  from?: BackSource;
}) {
  const cfg = BUCKETS[bucketKey];
  const Icon = cfg.icon;
  const collapsible = bucketKey === "completadas";
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
