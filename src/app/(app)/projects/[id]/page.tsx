"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  type Project,
  STATUS_LABELS,
  type Task,
} from "@/components/project-types";
import type {
  LocalTask,
  TaskUpdates,
} from "@/components/task-detail/task-detail-view";
import { Button } from "@/components/ui/button";
import { CalendarPanel } from "@/components/ui/calendar-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/field";
import { BackIcon, PlusIcon } from "@/components/ui/icons";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, LoadingRows, Panel } from "@/components/ui/panel";
import { Popover } from "@/components/ui/popover";
import { ProgressChip } from "@/components/ui/progress-chip";
import { STATUS_DOT } from "@/components/ui/status-badge";
import { type SyncState, SyncStatus } from "@/components/ui/sync-status";
import { Toast, type ToastState } from "@/components/ui/toast";
import { handleUnauthenticated } from "@/lib/api-client";
import { todayUtcMidnight } from "@/lib/calendar";
import { MAX_TASK_TITLE_LENGTH } from "@/lib/constraints";
import { formatDueDate, isOverdue } from "@/lib/format";
import { blockedFromDisponible, canCompleteAtProgress } from "@/lib/progress";
import { compareByRelevance, computeRelevance } from "@/lib/relevance";
import {
  ApiError,
  createSyncQueue,
  isTempId,
  type SyncQueue,
  sendJson,
  tempId,
} from "@/lib/sync-queue";

type ProjectDetail = Project & { tasks: Task[] };

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const newTaskOverflowRef = useRef(0);

  useEffect(() => {
    if (addingTask) newTaskInputRef.current?.focus();
  }, [addingTask]);

  function openAddTask() {
    setError(null);
    setAddingTask(true);
  }

  function closeAddTask() {
    setAddingTask(false);
    setError(null);
  }

  function showToast(message: string) {
    setToast({ id: Date.now(), message });
  }

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
    const title = newTaskTitle.trim().slice(0, MAX_TASK_TITLE_LENGTH);
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
        completedAt: null,
        position: Number.MAX_SAFE_INTEGER,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    setNewTaskTitle("");
    newTaskInputRef.current?.focus();

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
    queue.run(key, async () => {
      const taskId = await queue.idFor(key);
      await sendJson(`/api/tasks/${taskId}`, "DELETE");
    });
  }

  const dragRef = useRef<{
    movedKey: string;
    overKey: string | null;
    pointerId: number;
  } | null>(null);

  function handlePointerDownOnHandle(
    key: string,
    e: React.PointerEvent<HTMLElement>,
  ) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (dragRef.current) return;
    e.preventDefault();
    dragRef.current = { movedKey: key, overKey: null, pointerId: e.pointerId };
    setDraggedKey(key);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMoveOnHandle(e: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest<HTMLElement>("[data-task-key]");
    const key = row?.dataset.taskKey;
    const overKey = key && key !== drag.movedKey ? key : null;
    if (overKey !== drag.overKey) {
      drag.overKey = overKey;
      setDropTargetKey(overKey);
    }
  }

  function endDrag(reorder: boolean) {
    const drag = dragRef.current;
    dragRef.current = null;
    setDraggedKey(null);
    setDropTargetKey(null);
    if (reorder && drag?.overKey) {
      handleReorder(drag.movedKey, drag.overKey);
    }
  }

  function handlePointerUpOnHandle(e: React.PointerEvent<HTMLElement>) {
    if (dragRef.current?.pointerId !== e.pointerId) return;
    endDrag(true);
  }

  function handlePointerCancelOnHandle(e: React.PointerEvent<HTMLElement>) {
    if (dragRef.current?.pointerId !== e.pointerId) return;
    endDrag(false);
  }

  function handleReorder(movedKey: string, targetKey: string) {
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

  function applyAutomaticSort() {
    const now = new Date();
    const sortedIncomplete = tasks
      .filter((t) => t.status !== "completada")
      .map((task) => ({
        task,
        relevance: computeRelevance(
          Number(task.priority),
          task.dueDate ? new Date(task.dueDate) : null,
          now,
        ),
        progressPct: task.progressPct,
      }))
      .sort(compareByRelevance)
      .map(({ task }) => task);
    const sortedCompleted = tasks
      .filter((t) => t.status === "completada")
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    const next = [...sortedIncomplete, ...sortedCompleted];
    setTasks(next);

    queue.run("auto-sort", async () => {
      const taskIds = await Promise.all(next.map((t) => queue.idFor(t.key)));
      const updated = await sendJson<{ id: string; position: number }[]>(
        `/api/projects/${id}/tasks/reorder`,
        "POST",
        { taskIds },
      );
      setTasks((prev) =>
        prev.map((t) => {
          const match = updated.find((u) => u.id === t.id);
          return match ? { ...t, position: match.position } : t;
        }),
      );
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
        <div className="-mx-2 flex h-11 items-center">
          <BackLink />
        </div>
        <LoadingRows rows={4} />
      </>
    );
  }

  const incompleteTasks = tasks.filter((t) => t.status !== "completada");
  const completedTasks = tasks.filter((t) => t.status === "completada");
  const openCount = incompleteTasks.length;

  function renderTaskRow(task: LocalTask) {
    return (
      <TaskRow
        key={task.key}
        task={task}
        dragging={draggedKey === task.key}
        dropTarget={dropTargetKey === task.key && draggedKey !== task.key}
        onHandlePointerDown={(e) => handlePointerDownOnHandle(task.key, e)}
        onHandlePointerMove={handlePointerMoveOnHandle}
        onHandlePointerUp={handlePointerUpOnHandle}
        onHandlePointerCancel={handlePointerCancelOnHandle}
        onUpdate={(updates) => updateTask(task.key, updates)}
        onDelete={() => deleteTask(task.key)}
        onBlocked={showToast}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="-mx-2 flex h-11 items-center justify-between gap-4">
          <BackLink />
          <span className="pr-2">
            <SyncStatus state={syncState} />
          </span>
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

      {addingTask ? (
        <form
          onSubmit={handleAddTask}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeAddTask();
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              closeAddTask();
            }
          }}
          className="animate-reveal flex flex-col gap-2"
        >
          <div className="flex gap-4">
            <div className="relative min-w-0 flex-1">
              <Input
                ref={newTaskInputRef}
                type="text"
                aria-label="Título de la nueva tarea"
                placeholder="Añade una tarea y pulsa Enter"
                value={newTaskTitle}
                onChange={(e) => {
                  setNewTaskTitle(e.target.value);
                  if (e.target.value.length < MAX_TASK_TITLE_LENGTH) {
                    newTaskOverflowRef.current = 0;
                  }
                }}
                onKeyDown={(e) =>
                  trackTitleOverflowAttempt(
                    newTaskTitle.length,
                    e.key,
                    newTaskOverflowRef,
                    () =>
                      showToast(`Máximo: ${MAX_TASK_TITLE_LENGTH} caracteres.`),
                  )
                }
                maxLength={MAX_TASK_TITLE_LENGTH}
                className="w-full pr-20"
              />
              <span className="tabular pointer-events-none absolute inset-y-0 right-3 flex items-center text-meta text-muted">
                {newTaskTitle.length}/{MAX_TASK_TITLE_LENGTH}
              </span>
            </div>
            <Button type="submit" variant="primary">
              Añadir
            </Button>
          </div>
          <FormError message={error} />
        </form>
      ) : (
        <Button
          variant="secondary"
          onClick={openAddTask}
          className="self-start"
        >
          <PlusIcon />
          Añadir tarea
        </Button>
      )}

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
          description="Añade la primera con el botón de arriba. Luego puedes arrastrarlas para ordenarlas a tu manera."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {incompleteTasks.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-meta font-medium text-muted">
                  Tareas incompletas
                </h2>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={applyAutomaticSort}
                >
                  Ordenar automáticamente
                </Button>
              </div>
              <Panel>
                <ul className="divide-y divide-line">
                  {incompleteTasks.map((task) => renderTaskRow(task))}
                </ul>
              </Panel>
            </div>
          )}
          {completedTasks.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-meta font-medium text-muted">
                Tareas completadas
              </h2>
              <Panel>
                <ul className="divide-y divide-line">
                  {completedTasks.map((task) => renderTaskRow(task))}
                </ul>
              </Panel>
            </div>
          )}
        </div>
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

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

function BackLink() {
  return (
    <Link
      href="/projects"
      className="inline-flex h-11 min-w-0 items-center gap-0.5 rounded-[14px] pr-3 pl-1.5 text-ui font-medium text-muted transition-colors hover:text-ink"
    >
      <BackIcon />
      <span className="truncate">Proyectos</span>
    </Link>
  );
}

const TITLE_OVERFLOW_WARNING_THRESHOLD = 5;

/** Warns after a few keystrokes attempted past the title limit, instead of on every one. */
function trackTitleOverflowAttempt(
  currentLength: number,
  key: string,
  counterRef: React.MutableRefObject<number>,
  onLimitReached: () => void,
) {
  if (currentLength < MAX_TASK_TITLE_LENGTH || key.length !== 1) return;
  counterRef.current += 1;
  if (counterRef.current >= TITLE_OVERFLOW_WARNING_THRESHOLD) {
    counterRef.current = 0;
    onLimitReached();
  }
}

function TaskRow({
  task,
  dragging,
  dropTarget,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
  onHandlePointerCancel,
  onUpdate,
  onDelete,
  onBlocked,
}: {
  task: LocalTask;
  dragging: boolean;
  dropTarget: boolean;
  onHandlePointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onHandlePointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onHandlePointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onHandlePointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onUpdate: (updates: TaskUpdates) => void;
  onDelete: () => void;
  onBlocked: (message: string) => void;
}) {
  const done = task.status === "completada";
  const overdue = !done && task.dueDate && isOverdue(task.dueDate);
  const creating = isTempId(task.id);

  const [completePromptOpen, setCompletePromptOpen] = useState(false);

  function handleStatusChange(next: Task["status"]) {
    if (next === "completada") {
      if (!canCompleteAtProgress(task.progressPct)) {
        onBlocked("Sube el avance al 100% para poder completar la tarea.");
        return;
      }
      setCompletePromptOpen(true);
      return;
    }
    if (next === "disponible") {
      const blocked = blockedFromDisponible(task.progressPct, task.completedAt);
      if (blocked === "progress") {
        onBlocked("Baja el avance a 0% antes de pasarla a disponible.");
        return;
      }
      if (blocked === "completedAt") {
        onBlocked(
          "Esta tarea todavía tiene fecha de finalización. Cambia antes a otro estado.",
        );
        return;
      }
    }
    onUpdate({ status: next, completedAt: null });
  }

  function confirmComplete(date: Date) {
    setCompletePromptOpen(false);
    onUpdate({ status: "completada", completedAt: date.toISOString() });
  }

  const titleClassName = `min-w-0 flex-1 truncate rounded-[4px] px-1 -mx-1 py-1 text-left text-body font-medium sm:text-ui ${
    done ? "text-muted" : ""
  }`;

  // The title link is stretched over the whole row (`after:absolute after:inset-0`)
  // so the row navigates on click without nesting the row's own controls inside an
  // <a>. Those controls sit above it with `relative z-10`.
  return (
    <li
      data-task-key={task.key}
      className={`relative transition-opacity ${dragging ? "opacity-40" : ""} ${
        dropTarget ? "shadow-[inset_0_2px_0_var(--accent)]" : ""
      } ${creating ? "" : "hover:bg-sunken/40"}`}
    >
      <div className="flex items-center gap-x-2 px-3 py-2.5 sm:gap-x-3">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="relative z-10 cursor-grab select-none touch-none rounded-[4px] p-1 -m-1 text-muted active:cursor-grabbing"
            title="Arrastra para reordenar"
            aria-hidden="true"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerCancel}
          >
            ⠿
          </span>
          {creating ? (
            // A task still being created has no server id to navigate to yet.
            <span className={titleClassName}>{task.title}</span>
          ) : (
            <Link
              href={`/projects/${task.projectId}/tasks/${task.id}`}
              className={`${titleClassName} after:absolute after:inset-0 after:content-['']`}
            >
              {task.title}
            </Link>
          )}
          {creating && (
            <span
              title="Guardando"
              className="animate-syncing size-1.5 shrink-0 rounded-full bg-accent"
            >
              <span className="sr-only">Guardando</span>
            </span>
          )}
        </span>
        {task.dueDate && (
          <span
            className={`hidden shrink-0 tabular text-meta sm:inline ${overdue ? "font-medium text-danger" : "text-muted"}`}
            title={overdue ? "Vencida" : "Fecha límite"}
          >
            {formatDueDate(task.dueDate)}
          </span>
        )}
        <ProgressChip value={task.progressPct} />
        <span
          title={STATUS_LABELS[task.status]}
          aria-hidden="true"
          className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[task.status]} sm:hidden`}
        />
        <Popover
          open={completePromptOpen}
          onClose={() => setCompletePromptOpen(false)}
          className="z-10"
        >
          {/* biome-ignore lint/a11y/noLabelWithoutControl: wraps the Select component */}
          <label className="relative hidden shrink-0 items-center sm:flex">
            <span className="sr-only">Estado</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute left-2.5 size-2 rounded-full ${STATUS_DOT[task.status]}`}
            />
            <Select
              value={task.status}
              onChange={(e) =>
                handleStatusChange(e.target.value as Task["status"])
              }
              className="h-8 w-auto min-w-0 border-transparent bg-transparent pr-5 pl-6 text-meta sm:w-32 sm:min-w-[6.5rem] sm:border-line-strong sm:bg-raised sm:pr-7"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="pointer-events-none absolute right-2 size-3 text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5.5 8l4.5 4.5L14.5 8" />
            </svg>
          </label>
          {completePromptOpen && (
            <div className="absolute right-0 top-full z-20 mt-1.5">
              <p className="mb-1.5 px-1 text-meta font-medium text-muted">
                Fecha de finalización
              </p>
              <CalendarPanel
                selected={todayUtcMidnight()}
                shortcuts={[
                  { key: "today", label: "Hoy", date: todayUtcMidnight() },
                ]}
                onSelect={confirmComplete}
              />
            </div>
          )}
        </Popover>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar la tarea ${task.title}`}
          title="Eliminar tarea"
          className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-control text-muted active:bg-danger/10 active:text-danger sm:size-8 sm:hover:bg-danger/10 sm:hover:text-danger"
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
    </li>
  );
}
