import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Group, Task } from "@/components/group-types";
import type {
  LocalTask,
  TaskUpdates,
} from "@/components/task-detail/task-detail-view";
import type { SyncState } from "@/components/ui/sync-status";
import type { ToastState, ToastTone } from "@/components/ui/toast";
import { handleUnauthenticated } from "@/lib/api-client";
import { orderGroupTasks, sameTaskIdSequence } from "@/lib/relevance";
import {
  ApiError,
  createSyncQueue,
  type SyncQueue,
  sendJson,
} from "@/lib/sync-queue";

type GroupDetail = Group & { tasks: Task[] };

/** Group detail state: loading, optimistic task edits and their background sync. */
export function useGroupDetail(id: string) {
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
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
    const res = await fetch(`/api/groups/${id}`);
    if (handleUnauthenticated(res)) return;
    if (res.status === 404) {
      router.push("/groups");
      return;
    }
    const data: GroupDetail = await res.json();
    const { tasks: serverTasks, ...rest } = data;
    setGroup(rest);
    const loadedTasks = serverTasks.map((task) => ({ ...task, key: task.id }));
    applyGroupOrder(loadedTasks, orderGroupTasks(loadedTasks));
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
            ? `${err.message}. Recargamos el grupo para mostrar lo guardado.`
            : "Sin conexión con el servidor. Recargamos el grupo para mostrar lo guardado.",
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

  function applyGroupOrder(current: LocalTask[], ordered: LocalTask[]) {
    updateTasks(() => ordered);
    if (
      sameTaskIdSequence(
        current.map((task) => task.id),
        ordered.map((task) => task.id),
      )
    ) {
      return;
    }

    queue.run(`group-order:${id}`, async () => {
      const taskIds = await Promise.all(
        ordered.map((task) => queue.idFor(task.key)),
      );
      const updated = await sendJson<{ id: string; position: number }[]>(
        `/api/groups/${id}/tasks/reorder`,
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
    group,
    tasks,
    syncState,
    toast,
    showToast,
    dismissToast,
    updateTask,
  };
}
