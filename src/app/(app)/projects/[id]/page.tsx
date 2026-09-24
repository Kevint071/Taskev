"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Project, Task } from "@/components/project-types";
import type {
  LocalTask,
  TaskUpdates,
} from "@/components/task-detail/task-detail-view";
import { TaskRow } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/field";
import { BackIcon, PlusIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingRows, Panel } from "@/components/ui/panel";
import { type SyncState, SyncStatus } from "@/components/ui/sync-status";
import { Toast, type ToastState, type ToastTone } from "@/components/ui/toast";
import { handleUnauthenticated } from "@/lib/api-client";
import { MAX_TASK_TITLE_LENGTH } from "@/lib/constraints";
import { orderProjectTasks, sameTaskIdSequence } from "@/lib/relevance";
import {
  ApiError,
  createSyncQueue,
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
  const tasksRef = useRef<LocalTask[]>([]);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [toast, setToast] = useState<ToastState>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rowNow] = useState(() => new Date());
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

  function showToast(message: string, tone: ToastTone = "warning") {
    setToast({ id: Date.now(), message, tone });
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
    const loadedTasks = serverTasks.map((task) => ({ ...task, key: task.id }));
    applyProjectOrder(loadedTasks, orderProjectTasks(loadedTasks));
  }

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  // After a failed save the screen may no longer match the server: once the
  // queue drains, reload so what you see is what was stored.
  const resyncRef = useRef(false);
  const pendingRef = useRef(0);
  // Whether a save failed since the queue was last idle, so the status never
  // claims "saved" for a batch that lost changes.
  const failedRef = useRef(false);
  const [queue] = useState<SyncQueue>(() =>
    createSyncQueue({
      onError: (err) => {
        if (err instanceof ApiError && err.status === 401) {
          window.location.href = "/login";
          return;
        }
        showToast(
          err instanceof ApiError
            ? `${err.message}. Recargamos el proyecto para mostrar lo guardado.`
            : "Sin conexión con el servidor. Recargamos el proyecto para mostrar lo guardado.",
          "error",
        );
        failedRef.current = true;
        resyncRef.current = true;
      },
      onPendingChange: (pending) => {
        pendingRef.current = pending;
        if (pending > 0) {
          setSyncState("saving");
          return;
        }
        setSyncState(failedRef.current ? "error" : "saved");
        failedRef.current = false;
        if (resyncRef.current) {
          resyncRef.current = false;
          loadRef.current();
        }
      },
    }),
  );

  function updateTasks(updater: (current: LocalTask[]) => LocalTask[]) {
    const next = updater(tasksRef.current);
    tasksRef.current = next;
    setTasks(next);
    return next;
  }

  function applyProjectOrder(current: LocalTask[], ordered: LocalTask[]) {
    updateTasks(() => ordered);
    if (
      sameTaskIdSequence(
        current.map((task) => task.id),
        ordered.map((task) => task.id),
      )
    ) {
      return;
    }

    queue.run(`project-order:${id}`, async () => {
      const taskIds = await Promise.all(
        ordered.map((task) => queue.idFor(task.key)),
      );
      const updated = await sendJson<{ id: string; position: number }[]>(
        `/api/projects/${id}/tasks/reorder`,
        "POST",
        { taskIds },
      );
      updateTasks((previous) =>
        previous.map((task) => {
          const match = updated.find((item) => item.id === task.id);
          return match ? { ...task, position: match.position } : task;
        }),
      );
    });
  }

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
    // Offline the creation can only fail: keep the title typed instead of
    // showing a row that would never be saved.
    if (!navigator.onLine) {
      showToast("Sin conexión. La tarea no se añadió.", "error");
      return;
    }
    setError(null);
    const key = tempId();
    const now = new Date().toISOString();
    updateTasks((prev) => [
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
        pinnedToday: false,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    setNewTaskTitle("");
    newTaskInputRef.current?.focus();

    queue.create(key, async () => {
      let created: Task;
      try {
        created = await sendJson<Task>(`/api/projects/${id}/tasks`, "POST", {
          title,
        });
      } catch (err) {
        // The row was never stored: drop it rather than leave it pending.
        updateTasks((prev) => prev.filter((t) => t.key !== key));
        throw err;
      }
      const withCreatedTask = updateTasks((prev) =>
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
      applyProjectOrder(withCreatedTask, orderProjectTasks(withCreatedTask));
      return created.id;
    });
  }

  function applyLocal(key: string, updates: TaskUpdates) {
    const { priority, ...rest } = updates;
    updateTasks((prev) =>
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
        now={rowNow}
        showProject={false}
        centerProgressOnDesktop
        inlineProjectStatus
        onStatusChange={(change) => updateTask(task.key, change)}
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

      {tasks.length === 0 ? (
        <EmptyState
          title="Este proyecto no tiene tareas"
          description="Añade la primera con el botón de arriba."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {incompleteTasks.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-meta font-medium text-muted">
                Tareas incompletas
              </h2>
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
