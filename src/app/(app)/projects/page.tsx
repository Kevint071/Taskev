"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProjectSummary } from "@/components/project-types";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Panel } from "@/components/ui/panel";
import { handleUnauthenticated } from "@/lib/api-client";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(archived: boolean) {
    setLoading(true);
    const res = await fetch(`/api/projects?archived=${archived}`);
    if (handleUnauthenticated(res)) return;
    const data = await res.json();
    setProjects(data);
    setLoading(false);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load is redefined every render and only reads showArchived via its argument
  useEffect(() => {
    load(showArchived);
  }, [showArchived]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear el proyecto");
      return;
    }
    setName("");
    if (showArchived) setShowArchived(false);
    else load(false);
  }

  return (
    <>
      <PageHeader
        title="Proyectos"
        description="Agrupa tus tareas por objetivo. Archiva lo que ya no está activo."
      />

      <form onSubmit={handleCreate} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            type="text"
            aria-label="Nombre del nuevo proyecto"
            placeholder="Nombre del nuevo proyecto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="primary">
            Crear proyecto
          </Button>
        </div>
        <FormError message={error} />
      </form>

      <section className="flex flex-col gap-3">
        <div
          role="tablist"
          aria-label="Filtrar proyectos"
          className="flex gap-4 border-b border-line"
        >
          {[
            { value: false, label: "Activos" },
            { value: true, label: "Archivados" },
          ].map((tab) => {
            const active = tab.value === showArchived;
            return (
              <button
                key={tab.label}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setShowArchived(tab.value)}
                className={`-mb-px border-b-2 pb-2 font-medium transition-colors ${
                  active
                    ? "border-accent text-ink"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
                key={i}
                className="h-36 animate-pulse rounded-panel bg-sunken"
              />
            ))}
          </ul>
        ) : projects.length === 0 ? (
          <EmptyState
            title={
              showArchived
                ? "No hay proyectos archivados"
                : "Todavía no tienes proyectos"
            }
            description={
              showArchived
                ? "Cuando archives un proyecto aparecerá aquí, con todas sus tareas intactas."
                : "Escribe un nombre arriba para crear el primero."
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id}>
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function ProjectCard({ project: p }: { project: ProjectSummary }) {
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
