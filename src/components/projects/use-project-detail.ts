import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Project, Task } from "@/components/project-types";
import type {
  LocalTask,
  TaskUpdates,
} from "@/components/task-detail/task-detail-view";
import type { SyncState } from "@/components/ui/sync-status";
import type { ToastState, ToastTone } from "@/components/ui/toast";
import { handleUnauthenticated } from "@/lib/api-client";
import { orderProjectTasks, sameTaskIdSequence } from "@/lib/relevance";
import {
  ApiError,
  createSyncQueue,
  type SyncQueue,
  sendJson,
  tempId,
} from "@/lib/sync-queue";

type ProjectDetail = Project & { tasks: Task[] };

/** Project detail state: loading, optimistic task edits and their background sync. */
export function useProjectDetail(id: string) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const tasksRef = useRef<LocalTask[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [toast, setToast] = useState<ToastState>(null);

  function showToast(message: string, tone: ToastTone = "warning") {
    setToast({ id: Date.now(), message, tone });
  }

  function dismissToast() {
    setToast(null);
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

  /** Adds the task optimistically; returns false when it could not be queued. */
  function addTask(title: string): boolean {
    // Offline the creation can only fail: keep the title typed instead of
    // showing a row that would never be saved.
    if (!navigator.onLine) {
      showToast("Sin conexión. La tarea no se añadió.", "error");
      return false;
    }
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
    return true;
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

  return {
    project,
    tasks,
    syncState,
    toast,
    showToast,
    dismissToast,
    addTask,
    updateTask,
  };
}
