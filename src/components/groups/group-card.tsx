"use client";

import Link from "next/link";
import { useState } from "react";
import type { GroupSummary } from "@/components/group-types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MoreIcon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { Popover } from "@/components/ui/popover";
import { handleUnauthenticated } from "@/lib/api-client";

export function GroupCard({
  group: p,
  onUpdated,
  onError,
}: {
  group: GroupSummary;
  onUpdated: () => void;
  onError: (message: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);
  const done = p.avgProgress >= 100 && p.taskCount > 0;

  async function updateGroup(method: "PATCH" | "DELETE") {
    setPending(true);
    try {
      const response = await fetch(`/api/groups/${p.id}`, {
        method,
        ...(method === "PATCH"
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ archived: !p.archivedAt }),
            }
          : {}),
      });
      if (handleUnauthenticated(response)) return;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setConfirmDelete(false);
      onUpdated();
    } catch {
      onError(
        method === "DELETE"
          ? "No se pudo eliminar el grupo. Inténtalo de nuevo."
          : `No se pudo ${p.archivedAt ? "desarchivar" : "archivar"} el grupo. Inténtalo de nuevo.`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Panel
        className={`relative h-full transition-colors hover:border-line-strong ${menuOpen ? "z-20" : ""}`}
      >
        <Link
          href={`/groups/${p.id}`}
          className="group flex h-full flex-col gap-5 p-5"
        >
          <div className="min-w-0 pr-8">
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
        </Link>
        <div className="absolute top-2 right-2 z-20">
          <Popover open={menuOpen} onClose={() => setMenuOpen(false)}>
            <button
              type="button"
              aria-label={`Opciones de ${p.name}`}
              title={`Opciones de ${p.name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={pending}
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex size-11 items-center justify-center rounded-control text-muted hover:bg-sunken hover:text-ink disabled:opacity-50"
            >
              <MoreIcon className="size-5" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                aria-label={`Opciones de ${p.name}`}
                className="animate-menu-in absolute top-full right-0 z-30 w-44 rounded-control border border-line-strong bg-raised p-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    void updateGroup("PATCH");
                  }}
                  className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-ui hover:bg-sunken"
                >
                  {p.archivedAt ? "Desarchivar" : "Archivar"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                  className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-ui text-danger hover:bg-danger/10"
                >
                  Eliminar
                </button>
              </div>
            )}
          </Popover>
        </div>
      </Panel>
      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar este grupo?"
        description={
          <>
            Se borrarán <strong className="text-ink">{p.name}</strong> y todas
            sus tareas y comentarios. No se puede deshacer.
          </>
        }
        confirmLabel="Eliminar grupo"
        pending={pending}
        onConfirm={() => void updateGroup("DELETE")}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
