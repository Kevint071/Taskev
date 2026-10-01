"use client";

import Link from "next/link";
import { type CSSProperties, type PointerEvent, useState } from "react";
import type { GroupSummary } from "@/components/group-types";
import { EditGroupDialog } from "@/components/groups/edit-group-dialog";
import { OpenCount } from "@/components/groups/open-count";
import { useCountUp } from "@/components/groups/use-count-up";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ArrowRightIcon, CheckIcon, MoreIcon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { Popover } from "@/components/ui/popover";
import { handleUnauthenticated } from "@/lib/api-client";

export function GroupCard({
  group: p,
  enterDelay = 0,
  onUpdated,
  onError,
}: {
  group: GroupSummary;
  /** Milliseconds before the meter starts filling (staggers the grid). */
  enterDelay?: number;
  onUpdated: () => void;
  onError: (message: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const done = p.avgProgress >= 100 && p.taskCount > 0;
  const shown = useCountUp(p.avgProgress, enterDelay);

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

  const empty = p.taskCount === 0;
  const toneClass = empty
    ? "[--tone:var(--line-strong)]"
    : done
      ? "[--tone:var(--status-done)]"
      : "[--tone:var(--accent)]";

  // The spotlight and border highlight follow the cursor through CSS variables
  // set on the panel, without re-rendering.
  function followPointer(e: PointerEvent<HTMLElement>) {
    const panel = e.currentTarget.parentElement;
    if (!panel) return;
    const box = panel.getBoundingClientRect();
    panel.style.setProperty("--mx", `${e.clientX - box.left}px`);
    panel.style.setProperty("--my", `${e.clientY - box.top}px`);
  }

  return (
    <>
      <Panel
        className={`group/card spot-border relative h-full transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-[0_12px_32px_-16px_color-mix(in_srgb,var(--tone)_55%,transparent)] ${toneClass} ${menuOpen ? "z-20" : ""}`}
      >
        <Link
          href={`/groups/${p.id}`}
          onPointerMove={followPointer}
          className="group relative flex h-full flex-col gap-4 rounded-panel p-4"
        >
          {/* Light that trails the cursor, tinted by the state of the group. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(220px circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, var(--tone) 14%, transparent), transparent 70%)",
            }}
          />

          <div className="relative min-w-0 pr-9">
            <p className="flex items-center gap-1.5 font-semibold">
              <span className="truncate">{p.name}</span>
              <ArrowRightIcon className="size-3.5 -translate-x-1.5 text-accent opacity-0 transition-[opacity,translate] duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
            </p>
            {p.description && (
              <p className="mt-0.5 line-clamp-2 text-meta text-muted">
                {p.description}
              </p>
            )}
          </div>

          <div className="relative mt-auto flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3 text-meta">
              {done ? (
                <span className="flex items-center gap-1 font-medium text-status-done">
                  <CheckIcon className="size-3.5" />
                  Completado
                </span>
              ) : (
                <span className="tabular text-muted">
                  {empty ? (
                    "Sin tareas"
                  ) : (
                    <OpenCount
                      open={p.openCount}
                      total={p.taskCount}
                      numberClassName="text-body"
                    />
                  )}
                </span>
              )}
              <span
                aria-hidden="true"
                className={`tabular font-medium ${done ? "text-status-done" : empty ? "text-muted" : "text-ink"}`}
              >
                {shown}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`Avance de ${p.name}`}
              aria-valuenow={p.avgProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="relative h-0.75 rounded-full bg-line"
            >
              {!empty && (
                <div
                  className="animate-line-grow absolute inset-y-0 left-0 rounded-full"
                  style={
                    {
                      width: `${p.avgProgress}%`,
                      "--delay": `${enterDelay}ms`,
                      background:
                        "linear-gradient(90deg, color-mix(in srgb, var(--tone) 35%, transparent), var(--tone))",
                    } as CSSProperties
                  }
                >
                  <span className="absolute top-1/2 right-0 size-1.75 -translate-y-1/2 translate-x-1/2 rounded-full bg-(--tone) shadow-[0_0_10px_2px_color-mix(in_srgb,var(--tone)_70%,transparent)]" />
                </div>
              )}
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
              className="flex size-11 items-center justify-center rounded-control text-muted transition-opacity hover:bg-sunken hover:text-ink focus-visible:opacity-100 disabled:opacity-50 aria-expanded:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100"
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
                    setEditing(true);
                  }}
                  className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-ui hover:bg-sunken"
                >
                  Editar
                </button>
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
      {editing && (
        <EditGroupDialog
          group={p}
          onSaved={onUpdated}
          onClose={() => setEditing(false)}
        />
      )}
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
