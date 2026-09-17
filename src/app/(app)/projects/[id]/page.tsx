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
import { CalendarPanel } from "@/components/ui/calendar-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateField } from "@/components/ui/date-field";
import { Field, FormError } from "@/components/ui/field";
import { CheckIcon, PlusIcon } from "@/components/ui/icons";
import { Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState, LoadingRows, Panel } from "@/components/ui/panel";
import { Popover } from "@/components/ui/popover";
import { ProgressChip } from "@/components/ui/progress-chip";
import { ProgressInput } from "@/components/ui/progress-input";
import { STATUS_DOT } from "@/components/ui/status-badge";
import { Toast, type ToastState } from "@/components/ui/toast";
import { handleUnauthenticated } from "@/lib/api-client";
import { todayUtcMidnight } from "@/lib/calendar";
import { formatDateTime, formatDueDate, isOverdue } from "@/lib/format";
import { blockedFromDisponible, canCompleteAtProgress } from "@/lib/progress";
import { computeRelevance } from "@/lib/relevance";
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
  Pick<
    Task,
    | "title"
    | "description"
    | "status"
    | "progressPct"
    | "dueDate"
    | "completedAt"
  >
> & { priority?: number };

type SyncState = "idle" | "saving" | "saved";

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
  const [sortMode, setSortMode] = useState<"auto" | "manual">("auto");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingTask) newTaskInputRef.current?.focus();
  }, [addingTask]);

  function openAddTask() {
    setError(null);
    setAddingTask(true);
  }

  function closeAddTask() {
    setAddingTask(false);
    setNewTaskTitle("");
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

  const incompleteTasks = tasks.filter((t) => t.status !== "completada");
  const completedTasks = tasks.filter((t) => t.status === "completada");
  const openCount = incompleteTasks.length;

  if (sortMode === "auto") {
    const now = new Date();
    incompleteTasks.sort(
      (a, b) =>
        computeRelevance(
          Number(b.priority),
          b.dueDate ? new Date(b.dueDate) : null,
          now,
          b.progressPct,
        ) -
        computeRelevance(
          Number(a.priority),
          a.dueDate ? new Date(a.dueDate) : null,
          now,
          a.progressPct,
        ),
    );
    completedTasks.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  function renderTaskRow(task: LocalTask) {
    return (
      <TaskRow
        key={task.key}
        task={task}
        queue={queue}
        sortable={sortMode === "manual"}
        expanded={expandedKey === task.key}
        dragging={draggedKey === task.key}
        dropTarget={dropTargetKey === task.key && draggedKey !== task.key}
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
        onBlocked={showToast}
      />
    );
  }

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
            <Input
              ref={newTaskInputRef}
              type="text"
              aria-label="Título de la nueva tarea"
              placeholder="Añade una tarea y pulsa Enter"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="min-w-0 flex-1"
            />
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
                <SortModeToggle mode={sortMode} onChange={setSortMode} />
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

function SortModeToggle({
  mode,
  onChange,
}: {
  mode: "auto" | "manual";
  onChange: (mode: "auto" | "manual") => void;
}) {
  return (
    <fieldset className="flex shrink-0 rounded-control border border-line-strong p-0.5">
      <legend className="sr-only">Orden de las tareas</legend>
      {(
        [
          { value: "auto", label: "Automático" },
          { value: "manual", label: "Manual" },
        ] as const
      ).map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={mode === value}
          className={`rounded-[4px] px-2.5 py-1 text-meta font-medium transition-colors ${
            mode === value
              ? "bg-accent text-accent-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </fieldset>
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

function getCaretOffsetFromClick(e: React.MouseEvent): number | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
  };
  if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(e.clientX, e.clientY);
    if (range?.startContainer.nodeType === Node.TEXT_NODE) {
      return range.startOffset;
    }
  } else if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(e.clientX, e.clientY);
    if (pos?.offsetNode.nodeType === Node.TEXT_NODE) {
      return pos.offset;
    }
  }
  return null;
}

function TaskRow({
  task,
  queue,
  sortable,
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
  onBlocked,
}: {
  task: LocalTask;
  queue: SyncQueue;
  sortable: boolean;
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
  onBlocked: (message: string) => void;
}) {
  const done = task.status === "completada";
  const overdue = !done && task.dueDate && isOverdue(task.dueDate);
  const creating = isTempId(task.id);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const titleCaretRef = useRef<number | null>(null);
  const [completePromptOpen, setCompletePromptOpen] = useState(false);

  useEffect(() => {
    const el = titleInputRef.current;
    if (!editingTitle || !el) return;
    el.focus();
    const caret = titleCaretRef.current;
    const pos = caret == null ? el.value.length : Math.min(caret, el.value.length);
    el.setSelectionRange(pos, pos);
  }, [editingTitle]);

  useEffect(() => {
    const el = titleInputRef.current;
    if (!editingTitle || !el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [editingTitle, titleDraft]);

  function startEditingTitle(e: React.MouseEvent) {
    if (!expanded) return;
    e.stopPropagation();
    titleCaretRef.current = getCaretOffsetFromClick(e);
    setTitleDraft(task.title);
    setEditingTitle(true);
  }

  function commitTitle() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== task.title) onUpdate({ title: trimmed });
  }

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

  return (
    <li
      draggable={sortable}
      onDragStart={sortable ? onDragStart : undefined}
      onDragEnd={sortable ? onDragEnd : undefined}
      onDragOver={sortable ? onDragOver : undefined}
      onDrop={sortable ? onDrop : undefined}
      className={`transition-opacity ${dragging ? "opacity-40" : ""} ${
        dropTarget ? "shadow-[inset_0_2px_0_var(--accent)]" : ""
      } ${expanded ? "bg-sunken/40" : ""}`}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: wraps a select and a button, which can't nest inside a real <button> */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleExpand();
          }
        }}
        aria-expanded={expanded}
        className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 cursor-pointer sm:flex-nowrap"
      >
        <span
          className={`select-none ${
            sortable
              ? "cursor-grab text-muted active:cursor-grabbing"
              : "text-line-strong"
          }`}
          title={
            sortable
              ? "Arrastra para reordenar"
              : "Cambia a orden manual para arrastrar"
          }
          aria-hidden="true"
        >
          ⠿
        </span>
        <span
          className={`flex min-w-0 flex-1 items-center gap-2 rounded-[4px] py-1 text-left font-medium ${
            done ? "text-muted" : ""
          }`}
        >
          {editingTitle ? (
            <textarea
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commitTitle();
                } else if (e.key === "Escape") {
                  setTitleDraft(task.title);
                  setEditingTitle(false);
                }
              }}
              aria-label="Título de la tarea"
              rows={1}
              className="-mx-1 min-w-0 flex-1 resize-none overflow-hidden whitespace-normal break-words rounded-[4px] bg-transparent px-1 font-medium text-ink caret-accent outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={startEditingTitle}
              title="Editar nombre"
              className={`min-w-0 rounded-[4px] px-1 -mx-1 text-left hover:bg-sunken ${
                expanded ? "whitespace-normal break-words" : "truncate"
              }`}
            >
              {task.title}
            </button>
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
          <Popover
            open={completePromptOpen}
            onClose={() => setCompletePromptOpen(false)}
          >
            {/* biome-ignore lint/a11y/noLabelWithoutControl: wraps the Select component */}
            <label className="relative flex items-center">
              <span className="sr-only">Estado</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute left-2.5 size-2 rounded-full ${STATUS_DOT[task.status]}`}
              />
              <Select
                value={task.status}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  handleStatusChange(e.target.value as Task["status"])
                }
                className="h-8 w-32 pr-7 pl-6 text-meta"
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
                className="pointer-events-none absolute right-2.5 size-3 text-muted"
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
              // biome-ignore lint/a11y/noStaticElementInteractions: event boundary only, stops the row's own click-to-expand handler; the panel's own buttons are the real interactive elements
              <div
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                className="absolute right-0 top-full z-20 mt-1.5"
              >
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
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
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
  const [bannerCompleteOpen, setBannerCompleteOpen] = useState(false);

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
    <div className="animate-reveal flex flex-col gap-5 px-4 py-4 sm:pl-10">
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
        <Field label="Fecha límite" className="w-44">
          <DateField
            value={task.dueDate}
            onChange={(dueDate) => onUpdate({ dueDate })}
          />
        </Field>
        {task.status === "completada" && (
          <Field label="Fecha de finalización" className="w-44">
            <DateField
              value={task.completedAt}
              onChange={(completedAt) => onUpdate({ completedAt })}
              allowClear={false}
              placeholder="Elige la fecha"
            />
          </Field>
        )}
        {task.progressPct >= 100 && task.status !== "completada" && (
          <Popover
            open={bannerCompleteOpen}
            onClose={() => setBannerCompleteOpen(false)}
            className="w-fit"
          >
            <button
              type="button"
              onClick={() => setBannerCompleteOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-control border border-accent/30 bg-accent-soft px-3.5 text-ui font-medium text-accent transition-colors hover:border-accent/60"
            >
              <CheckIcon />
              Marcar completada
            </button>
            {bannerCompleteOpen && (
              <div className="absolute z-20 mt-1.5">
                <CalendarPanel
                  selected={todayUtcMidnight()}
                  shortcuts={[
                    { key: "today", label: "Hoy", date: todayUtcMidnight() },
                  ]}
                  onSelect={(date) => {
                    setBannerCompleteOpen(false);
                    onUpdate({
                      status: "completada",
                      completedAt: date.toISOString(),
                    });
                  }}
                />
              </div>
            )}
          </Popover>
        )}
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
