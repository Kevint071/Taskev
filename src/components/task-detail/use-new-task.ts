import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Task } from "@/components/group-types";
import type { ToastState, ToastTone } from "@/components/ui/toast";
import { MAX_TASK_TITLE_LENGTH } from "@/lib/constraints";
import { groupTaskViewHref, groupTaskViewOf } from "@/lib/group-task-views";
import { PROGRESS_MAX } from "@/lib/progress";
import { ApiError, sendJson } from "@/lib/sync-queue";

export type Draft = {
  title: string;
  description: string;
  status: Task["status"];
  progressPct: number;
  priority: number;
  dueDate: string | null;
  completedAt: string | null;
  pinnedToday: boolean;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  description: "",
  status: "disponible",
  progressPct: 0,
  priority: 0,
  dueDate: null,
  completedAt: null,
  pinnedToday: false,
};

/** The local form state of a task that does not exist yet, and its creation. */
export function useNewTask(groupId: string) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const canSave = draft.title.trim() !== "" && !saving;

  function showToast(message: string, tone: ToastTone = "warning") {
    setToast({ id: Date.now(), message, tone });
  }

  function update(changes: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...changes }));
  }

  /**
   * Keeps the draft creatable: "disponible" means untouched, so any progress
   * moves it to "en_curso", and "completada" can't stay below 100 %.
   */
  function changeProgress(progressPct: number) {
    setDraft((prev) => {
      if (prev.status === "disponible" && progressPct > 0) {
        return { ...prev, progressPct, status: "en_curso" };
      }
      if (prev.status === "completada" && progressPct < PROGRESS_MAX) {
        return { ...prev, progressPct, status: "en_curso", completedAt: null };
      }
      return { ...prev, progressPct };
    });
  }

  async function create() {
    if (!canSave) return;
    setSaving(true);
    try {
      await sendJson<Task>(`/api/groups/${groupId}/tasks`, "POST", {
        title: draft.title.trim().slice(0, MAX_TASK_TITLE_LENGTH),
        description: draft.description.trim() ? draft.description : null,
        status: draft.status,
        progressPct: draft.progressPct,
        priority: draft.priority,
        dueDate: draft.dueDate,
        completedAt: draft.completedAt,
        pinnedToday: draft.pinnedToday,
      });
      // Land on the tab the new task falls into; replace so going back from
      // the group doesn't reopen an empty form.
      router.replace(groupTaskViewHref(groupId, groupTaskViewOf(draft)));
    } catch (err) {
      setSaving(false);
      if (err instanceof ApiError && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      showToast(
        err instanceof ApiError
          ? err.message
          : "Sin conexión. La tarea no se creó.",
        "error",
      );
    }
  }

  return {
    draft,
    saving,
    canSave,
    toast,
    showToast,
    dismissToast: () => setToast(null),
    update,
    changeProgress,
    create,
  };
}
