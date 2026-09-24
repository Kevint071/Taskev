import Link from "next/link";
import type { ProjectSummary } from "@/components/project-types";
import { Panel } from "@/components/ui/panel";

export function ProjectCard({ project: p }: { project: ProjectSummary }) {
  const done = p.avgProgress >= 100 && p.taskCount > 0;
  return (
    <Link href={`/projects/${p.id}`} className="group block h-full">
      <Panel className="flex h-full flex-col gap-5 p-5 transition-colors group-hover:border-line-strong">
        <div className="min-w-0">
          <p className="truncate font-medium group-hover:text-accent">
            {p.name}
          </p>
          {p.description ? (
            <p className="mt-1 line-clamp-2 text-meta text-muted">
              {p.description}
            </p>
          ) : (
            <p className="mt-1 text-meta text-muted">
              {p.taskCount === 0
                ? "Sin tareas"
                : `${p.openCount} ${p.openCount === 1 ? "abierta" : "abiertas"}`}
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center justify-between">
            {p.description && (
              <span className="tabular text-meta text-muted">
                {p.taskCount === 0
                  ? "Sin tareas"
                  : `${p.openCount} ${p.openCount === 1 ? "abierta" : "abiertas"}`}
              </span>
            )}
            <span
              className={`tabular ml-auto text-meta font-medium ${done ? "text-status-done" : "text-ink"}`}
            >
              {p.avgProgress}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`Avance de ${p.name}`}
            aria-valuenow={p.avgProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 overflow-hidden rounded-full bg-sunken"
          >
            <div
              className={`h-full rounded-full ${done ? "bg-status-done" : "bg-accent"}`}
              style={{ width: `${p.avgProgress}%` }}
            />
          </div>
        </div>
      </Panel>
    </Link>
  );
}
