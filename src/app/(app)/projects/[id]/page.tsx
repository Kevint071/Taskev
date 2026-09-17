"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  type Project,
  STATUS_LABELS,
  type Task,
  type TaskComment,
} from "@/components/project-types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, FormError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState, LoadingRows, Panel } from "@/components/ui/panel";
import { ProgressChip } from "@/components/ui/progress-chip";
import { ProgressInput } from "@/components/ui/progress-input";
import { STATUS_DOT } from "@/components/ui/status-badge";
import { handleUnauthenticated } from "@/lib/api-client";
import { formatDateTime, formatDueDate, isOverdue } from "@/lib/format";
import {
  ApiError,
  createSyncQueue,
  isTempId,
  type SyncQueue,
  sendJson,
  tempId,
} from "@/lib/sync-queue";

/**
 * `key` is stable for the life of the row: for a task created on this screen
 * it stays the temporary id even after the server assigns the real `id`, so
 * the row (and its open details) are not remounted.
 */
type LocalTask = Task & { key: string };
type ProjectDetail = Project & { tasks: Task[] };
type TaskUpdates = Partial<
  Pick<Task, "title" | "description" | "status" | "progressPct" | "dueDate">
> & { priority?: number };

type SyncState = "idle" | "saving" | "saved";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const res = await fetch(`/api/projects/${id}`);
    if (handleUnauthenticated(res)) return;
    if (res.status === 404) {
      router.push("/projects");
      return;
    }
    const data: ProjectDetail = await res.json();
    const { tasks: serverTasks, ...rest } = data;
    setProject(rest);
    setTasks(serverTasks.map((t) => ({ ...t, key: t.id })));
  }

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  // After a failed save the screen may no longer match the server: once the
  // queue drains, reload so what you see is what was stored.
  const resyncRef = useRef(false);
  const pendingRef = useRef(0);
  const [queue] = useState<SyncQueue>(() =>
    createSyncQueue({
      onError: (err) => {
        if (err instanceof ApiError && err.status === 401) {
          window.location.href = "/login";
          return;
        }
        setSyncError(
          err instanceof ApiError
            ? `${err.message}. Recargamos el proyecto para mostrar lo guardado.`
            : "Sin conexión con el servidor. Recargamos el proyecto para mostrar lo guardado.",
        );
        resyncRef.current = true;
      },
      onPendingChange: (pending) => {
        pendingRef.current = pending;
        setSyncState(pending > 0 ? "saving" : "saved");
        if (pending === 0 && resyncRef.current) {
          resyncRef.current = false;
          loadRef.current();
        }
      },
    }),
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: load reads `id` via closure and is redefined every render
  useEffect(() => {
    load();
  }, [id]);

  // Warn before leaving while changes are still on their way to the server.
  useEffect(() => {
    if (syncState !== "saving") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingRef.current > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [syncState]);

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) {
      setError("Escribe un título para la tarea");
      return;
    }
    setError(null);
    const key = tempId();
    const now = new Date().toISOString();
    setTasks((prev) => [
      ...prev,
      {
        key,
        id: key,
        projectId: id,
        title,
        description: null,
        status: "disponible",
        progressPct: 0,
        priority: "0",
        dueDate: null,
        position: Number.MAX_SAFE_INTEGER,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    setNewTaskTitle("");

    queue.create(key, async () => {
      const created = await sendJson<Task>(
        `/api/projects/${id}/tasks`,
        "POST",
        { title },
      );
      setTasks((prev) =>
        prev.map((t) =>
          t.key === key
            ? {
                ...t,
                id: created.id,
                position: created.position,
                createdAt: created.createdAt,
              }
            : t,
        ),
      );
      return created.id;
    });
  }

  function applyLocal(key: string, updates: TaskUpdates) {
    const { priority, ...rest } = updates;
    setTasks((prev) =>
      prev.map((t) =>
        t.key === key
          ? {
              ...t,
              ...rest,
              ...(priority === undefined ? {} : { priority: String(priority) }),
            }
          : t,
      ),
    );
  }

  function saveRemote(key: string, updates: TaskUpdates) {
    queue.run(key, async () => {
      const taskId = await queue.idFor(key);
      await sendJson(`/api/tasks/${taskId}`, "PATCH", updates);
    });
  }

  function updateTask(key: string, updates: TaskUpdates) {
    applyLocal(key, updates);
    saveRemote(key, updates);
  }

  function deleteTask(key: string) {
    setTasks((prev) => prev.filter((t) => t.key !== key));
    if (expandedKey === key) setExpandedKey(null);
    queue.run(key, async () => {
      const taskId = await queue.idFor(key);
      await sendJson(`/api/tasks/${taskId}`, "DELETE");
    });
  }

  function handleDrop(targetKey: string) {
    setDropTargetKey(null);
    const movedKey = draggedKey;
    setDraggedKey(null);
    if (!movedKey || movedKey === targetKey) return;

    const next = [...tasks];
    const [dragged] = next.splice(
      next.findIndex((t) => t.key === movedKey),
      1,
    );
    next.splice(
      next.findIndex((t) => t.key === targetKey),
      0,
      dragged,
    );
    const newIndex = next.findIndex((t) => t.key === movedKey);
    const beforeKey = newIndex > 0 ? next[newIndex - 1].key : null;
    const afterKey = newIndex < next.length - 1 ? next[newIndex + 1].key : null;
    setTasks(next);

    queue.run(movedKey, async () => {
      const [taskId, beforeTaskId, afterTaskId] = await Promise.all([
        queue.idFor(movedKey),
        beforeKey ? queue.idFor(beforeKey) : null,
        afterKey ? queue.idFor(afterKey) : null,
      ]);
      await sendJson(`/api/tasks/${taskId}/reorder`, "POST", {
        beforeTaskId,
        afterTaskId,
      });
    });
  }

  function toggleArchive() {
    if (!project) return;
    const archived = !project.archivedAt;
    setProject({
      ...project,
      archivedAt: archived ? new Date().toISOString() : null,
    });
    queue.run(`project:${id}`, async () => {
      await sendJson(`/api/projects/${id}`, "PATCH", { archived });
    });
  }

  async function handleDeleteProject() {
    setDeleting(true);
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/projects");
  }

  if (!project) {
    return (
      <>
        <BackLink />
        <LoadingRows rows={4} />
      </>
    );
  }

  const openCount = tasks.filter((t) => t.status !== "completada").length;

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <BackLink />
          <SyncStatus state={syncState} />
        </div>
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-page font-semibold break-words">
                {project.name}
              </h1>
              {project.archivedAt && (
                <span className="rounded-full border border-line-strong px-2 py-0.5 text-meta text-muted">
                  Archivado
                </span>
              )}
            </div>
            {project.description && (
              <p className="mt-1 max-w-prose text-muted">
                {project.description}
              </p>
            )}
            <p className="tabular mt-1 text-meta text-muted">
              {tasks.length === 0
                ? "Sin tareas"
                : `${openCount} abiertas de ${tasks.length}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={toggleArchive}>
              {project.archivedAt ? "Desarchivar" : "Archivar"}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setConfirmDelete(true)}
            >
              Eliminar
            </Button>
          </div>
        </header>
      </div>

      <form onSubmit={handleAddTask} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            type="text"
            aria-label="Título de la nueva tarea"
            placeholder="Añade una tarea y pulsa Enter"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="primary">
            Añadir tarea
          </Button>
        </div>
        <FormError message={error} />
      </form>

      {syncError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-control border border-danger/30 bg-danger/10 px-3 py-2 text-danger"
        >
          <span>{syncError}</span>
          <button
            type="button"
            onClick={() => setSyncError(null)}
            className="shrink-0 rounded-[4px] text-meta font-medium hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          title="Este proyecto no tiene tareas"
          description="Añade la primera arriba. Luego puedes arrastrarlas para ordenarlas a tu manera."
        />
      ) : (
        <Panel>
          <ul className="divide-y divide-line">
            {tasks.map((task) => (
              <TaskRow
                key={task.key}
                task={task}
                queue={queue}
                expanded={expandedKey === task.key}
                dragging={draggedKey === task.key}
                dropTarget={
                  dropTargetKey === task.key && draggedKey !== task.key
                }
                onToggleExpand={() =>
                  setExpandedKey(expandedKey === task.key ? null : task.key)
                }
                onDragStart={() => setDraggedKey(task.key)}
                onDragEnd={() => {
                  setDraggedKey(null);
                  setDropTargetKey(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dropTargetKey !== task.key) setDropTargetKey(task.key);
                }}
                onDrop={() => handleDrop(task.key)}
                onUpdate={(updates) => updateTask(task.key, updates)}
                onLocalChange={(updates) => applyLocal(task.key, updates)}
                onRemoteSave={(updates) => saveRemote(task.key, updates)}
                onDelete={() => deleteTask(task.key)}
              />
            ))}
          </ul>
        </Panel>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar este proyecto?"
        description={
          <>
            Se borrarán <strong className="text-ink">{project.name}</strong> y
            todas sus tareas y comentarios. No se puede deshacer.
          </>
        }
        confirmLabel="Eliminar proyecto"
        pending={deleting}
        onConfirm={handleDeleteProject}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}

function SyncStatus({ state }: { state: SyncState }) {
  return (
    <p
      aria-live="polite"
      className="flex items-center gap-1.5 text-meta text-muted"
    >
      {state === "saving" && (
        <>
          <span
            aria-hidden="true"
            className="animate-syncing size-1.5 rounded-full bg-accent"
          />
          Guardando…
        </>
      )}
      {state === "saved" && (
        <>
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-status-done"
          />
          Cambios guardados
        </>
      )}
    </p>
  );
}

function BackLink() {
  return (
    <Link
      href="/projects"
      className="w-fit text-meta text-muted hover:text-ink"
    >
      ‹ Proyectos
    </Link>
  );
}

function TaskRow({
  task,
  queue,
  expanded,
  dragging,
  dropTarget,
  onToggleExpand,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onUpdate,
  onLocalChange,
  onRemoteSave,
  onDelete,
}: {
  task: LocalTask;
  queue: SyncQueue;
  expanded: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onToggleExpand: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onUpdate: (updates: TaskUpdates) => void;
  onLocalChange: (updates: TaskUpdates) => void;
  onRemoteSave: (updates: TaskUpdates) => void;
  onDelete: () => void;
}) {
  const done = task.status === "completada";
  const overdue = !done && task.dueDate && isOverdue(task.dueDate);
  const creating = isTempId(task.id);

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`transition-opacity ${dragging ? "opacity-40" : ""} ${
        dropTarget ? "shadow-[inset_0_2px_0_var(--accent)]" : ""
      } ${expanded ? "bg-sunken/40" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:flex-nowrap">
        <span
          className="cursor-grab text-muted select-none active:cursor-grabbing"
          title="Arrastra para reordenar"
          aria-hidden="true"
        >
          ⠿
        </span>
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          className={`flex min-w-0 flex-1 items-center gap-2 rounded-[4px] py-1 text-left font-medium ${
            done ? "text-muted line-through decoration-line-strong" : ""
          }`}
        >
          <span className="truncate">{task.title}</span>
          {creating && (
            <span
              title="Guardando"
              className="animate-syncing size-1.5 shrink-0 rounded-full bg-accent"
            >
              <span className="sr-only">Guardando</span>
            </span>
          )}
        </button>
        <div className="ml-6 flex items-center gap-3 sm:ml-0">
          {task.dueDate && (
            <span
              className={`tabular text-meta ${overdue ? "font-medium text-danger" : "text-muted"}`}
              title={overdue ? "Vencida" : "Fecha límite"}
            >
              {formatDueDate(task.dueDate)}
            </span>
          )}
          <ProgressChip value={task.progressPct} />
          {/* biome-ignore lint/a11y/noLabelWithoutControl: wraps the Select component */}
          <label className="relative flex items-center">
            <span className="sr-only">Estado</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute left-2.5 size-2 rounded-full ${STATUS_DOT[task.status]}`}
            />
            <Select
              value={task.status}
              onChange={(e) =>
                onUpdate({ status: e.target.value as Task["status"] })
              }
              className="h-8 w-[136px] pl-6 text-meta"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Eliminar la tarea ${task.title}`}
            title="Eliminar tarea"
            className="flex size-8 items-center justify-center rounded-control text-muted hover:bg-danger/10 hover:text-danger"
          >
            <svg
              viewBox="0 0 20 20"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <TaskDetails
          task={task}
          queue={queue}
          onUpdate={onUpdate}
          onLocalChange={onLocalChange}
          onRemoteSave={onRemoteSave}
        />
      )}
    </li>
  );
}

function TaskDetails({
  task,
  queue,
  onUpdate,
  onLocalChange,
  onRemoteSave,
}: {
  task: LocalTask;
  queue: SyncQueue;
  onUpdate: (updates: TaskUpdates) => void;
  onLocalChange: (updates: TaskUpdates) => void;
  onRemoteSave: (updates: TaskUpdates) => void;
}) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [description, setDescription] = useState(task.description ?? "");

  // A task still being created has no comments on the server yet.
  const serverId = isTempId(task.id) ? null : task.id;
  useEffect(() => {
    if (!serverId) return;
    let cancelled = false;
    fetch(`/api/tasks/${serverId}/comments`)
      .then((r) => (r.ok ? r.json() : []))
      .then((stored: TaskComment[]) => {
        if (cancelled) return;
        // Keep entries written here that the server has not confirmed yet.
        setComments((prev) => [
          ...stored,
          ...prev.filter((c) => isTempId(c.id)),
        ]);
      });
    return () => {
      cancelled = true;
    };
  }, [serverId]);

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    const body = newComment.trim();
    if (!body) return;
    const commentId = tempId();
    setComments((prev) => [
      ...prev,
      {
        id: commentId,
        taskId: task.id,
        body,
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewComment("");

    const taskKey = task.key;
    queue.run(taskKey, async () => {
      try {
        const taskId = await queue.idFor(taskKey);
        const created = await sendJson<TaskComment>(
          `/api/tasks/${taskId}/comments`,
          "POST",
          { body },
        );
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? created : c)),
        );
      } catch (err) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        throw err;
      }
    });
  }

  return (
    <div className="animate-reveal flex flex-col gap-5 border-t border-line px-4 py-4 sm:pl-10">
      <div className="flex flex-wrap items-end gap-4">
        <ProgressInput
          value={task.progressPct}
          onChange={(progressPct) => onLocalChange({ progressPct })}
          onSave={(progressPct) => onRemoteSave({ progressPct })}
        />
        <Field label="Prioridad" className="w-28">
          <Input
            type="number"
            step="0.1"
            defaultValue={Number(task.priority)}
            onBlur={(e) => {
              const priority = Number(e.target.value);
              if (priority !== Number(task.priority)) onUpdate({ priority });
            }}
            className="tabular"
          />
        </Field>
        <Field label="Fecha límite">
          <Input
            type="date"
            defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ""}
            onChange={(e) =>
              onUpdate({
                // Due dates are stored as UTC midnight.
                dueDate: e.target.value
                  ? `${e.target.value}T00:00:00.000Z`
                  : null,
              })
            }
            className="tabular"
          />
        </Field>
      </div>

      <Field label="Descripción">
        <Textarea
          value={description}
          placeholder="Notas, contexto, enlaces…"
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            if (description !== (task.description ?? "")) {
              onUpdate({ description });
            }
          }}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <p className="text-meta font-medium text-muted">
          Bitácora
          {comments.length > 0 && (
            <span className="tabular"> ({comments.length})</span>
          )}
        </p>
        {comments.length > 0 && (
          <ol className="flex flex-col gap-3 border-l border-line-strong pl-4">
            {comments.map((c) => (
              <li
                key={c.id}
                className={`relative ${isTempId(c.id) ? "opacity-70" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 -left-[20.5px] size-2 rounded-full border border-line-strong bg-raised"
                />
                <p className="tabular text-meta text-muted">
                  {formatDateTime(c.createdAt)}
                </p>
                <p className="whitespace-pre-wrap">{c.body}</p>
              </li>
            ))}
          </ol>
        )}
        <form onSubmit={handleAddComment} className="flex gap-2">
          <Input
            type="text"
            aria-label="Nueva entrada en la bitácora"
            placeholder="¿Qué avanzó o qué cambió?"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-w-0 flex-1"
          />
          <Button type="submit" disabled={!newComment.trim()}>
            Añadir
          </Button>
        </form>
      </div>
    </div>
  );
}
