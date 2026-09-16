"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/nav-bar";
import type { Project } from "@/components/project-types";
import { handleUnauthenticated } from "@/lib/api-client";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
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
    load(showArchived);
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="text-2xl font-semibold">Mis proyectos</h1>

        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            placeholder="Nombre del nuevo proyecto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded border border-neutral-300 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded bg-neutral-900 px-4 py-2 text-white"
          >
            Crear
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Mostrar proyectos archivados
        </label>

        {loading ? (
          <p className="text-sm text-neutral-500">Cargando...</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {showArchived
              ? "No hay proyectos archivados."
              : "Todavía no tienes proyectos."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="block rounded border border-neutral-200 px-4 py-3 hover:bg-neutral-100"
                >
                  <span className="font-medium">{p.name}</span>
                  {p.description && (
                    <span className="ml-2 text-sm text-neutral-500">
                      {p.description}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
