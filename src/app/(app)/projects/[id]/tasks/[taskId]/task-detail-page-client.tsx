"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Task } from "@/components/project-types";
import {
  TaskDetailView,
  type TaskUpdates,
} from "@/components/task-detail/task-detail-view";
import { Toast, type ToastState } from "@/components/ui/toast";
import {
  ApiError,
  createSyncQueue,
  type SyncQueue,
  sendJson,
} from "@/lib/sync-queue";

/** Client-side editing shell for a single task: sync queue + optimistic updates. */
export function TaskDetailPageClient({
  initialTask,
  back,
}: {
  initialTask: Task;
  back: { href: string; label: string };
}) {
  const router = useRouter();
  const [task, setTask] = useState(initialTask);
  const [toast, setToast] = useState<ToastState>(null);
  const [deleting, setDeleting] = useState(false);

  function showToast(message: string) {
    setToast({ id: Date.now(), message });
  }

  const [queue] = useState<SyncQueue>(() =>
    createSyncQueue({
      onError: (err) => {
        if (err instanceof ApiError && err.status === 401) {
          window.location.href = "/login";
          return;
        }
        showToast(
          err instanceof ApiError
            ? err.message
            : "Sin conexión con el servidor.",
        );
      },
    }),
  );

  function applyLocal(updates: TaskUpdates) {
    const { priority, ...rest } = updates;
    setTask((prev) => ({
      ...prev,
      ...rest,
      ...(priority === undefined ? {} : { priority: String(priority) }),
    }));
  }

  function saveRemote(updates: TaskUpdates) {
    queue.run(task.id, async () => {
      await sendJson(`/api/tasks/${task.id}`, "PATCH", updates);
    });
  }

  function updateTask(updates: TaskUpdates) {
    applyLocal(updates);
    saveRemote(updates);
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await sendJson(`/api/tasks/${task.id}`, "DELETE");
      router.push(back.href);
    } catch (err) {
      setDeleting(false);
      showToast(
        err instanceof ApiError ? err.message : "No se pudo eliminar la tarea.",
      );
    }
  }

  return (
    <>
      <TaskDetailView
        task={{ ...task, key: task.id }}
        queue={queue}
        back={back}
        onUpdate={updateTask}
        onBlocked={showToast}
        onDelete={handleDelete}
      />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
