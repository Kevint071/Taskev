"use client";

import { type CSSProperties, useEffect, useState } from "react";
import type { StatusChange } from "@/components/tasks/status-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TrashIcon } from "@/components/ui/icons";
import { STATUS_TONE } from "@/components/ui/status-badge";
import { daysBetweenUtc } from "@/lib/calendar";
import { PROGRESS_MAX } from "@/lib/progress";
import type { SyncQueue } from "@/lib/sync-queue";
import { CommentComposer } from "./comment-composer";
import { CommentLog } from "./comment-log";
import { DescriptionField } from "./description-field";
import { useFlash } from "./flash-wrap";
import { TaskNavBar } from "./task-nav-bar";
import { TaskPropertyChips } from "./task-property-chips";
import { TaskPropertySheet, usePropertySheet } from "./task-property-sheet";
import type { LocalTask, TaskUpdates } from "./task-types";
import { TitleField } from "./title-field";
import { useDeferredSave } from "./use-deferred-save";
import { useTaskComments } from "./use-task-comments";

export function TaskDetailView({
  task,
  queue,
  back,
  onUpdate,
  onBlocked,
  onDelete,
}: {
  task: LocalTask;
  queue: SyncQueue;
  /** Where the top-left arrow leads (usually the task's group). */
  back?: { href: string; label: string };
  onUpdate: (updates: TaskUpdates) => void;
  onBlocked: (message: string) => void;
  /** When provided, a delete action is offered in the "more" menu. */
  onDelete?: () => void;
}) {
  const { comments, addComment } = useTaskComments(task, queue);
  const { flash, bumpFlash } = useFlash();
  const sheet = usePropertySheet();
  const [progressDraft, setProgressDraft] = useState(task.progressPct);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const progressSave = useDeferredSave((progressPct: number) => {
    if (progressPct === task.progressPct) return;
    onUpdate({ progressPct });
    bumpFlash("progress");
  });
  const prioritySave = useDeferredSave((priority: number) => {
    if (priority === Number(task.priority)) return;
    onUpdate({ priority });
    bumpFlash("priority");
  });

  // Resync the draft if the task changes from outside (e.g. a reload).
  useEffect(() => setProgressDraft(task.progressPct), [task.progressPct]);

  function closeSheet() {
    progressSave.flush();
    prioritySave.flush();
    sheet.hide();
  }

  function changeProgress(next: number) {
    setProgressDraft(next);
    progressSave.schedule(next);
  }

  function changeStatus(change: StatusChange) {
    // The status change must reach the server after the progress it depends on.
    progressSave.flush();
    if (change.progressPct !== undefined) {
      setProgressDraft(change.progressPct);
      bumpFlash("progress");
    }
    onUpdate(change);
  }

  function requestCompletion() {
    progressSave.flush();
    sheet.show("completion");
  }

  function saveCompletion(date: Date) {
    const completedAt = date.toISOString();
    sheet.hide();
    if (task.status === "completada") {
      if (completedAt !== task.completedAt) {
        onUpdate({ completedAt });
        bumpFlash("completedAt");
      }
    } else {
      onUpdate({ status: "completada", completedAt });
    }
  }

  function saveDueDate(date: Date | null) {
    const dueDate = date ? date.toISOString() : null;
    sheet.hide();
    if (dueDate === task.dueDate) return;
    onUpdate({ dueDate });
    bumpFlash("dueDate");
  }

  const done = task.status === "completada";
  const dueOffset = task.dueDate
    ? daysBetweenUtc(new Date(task.dueDate))
    : null;
  const overdue = dueOffset !== null && dueOffset < 0 && !done;
  const readyToComplete = progressDraft >= PROGRESS_MAX && !done;

  return (
    <div
      style={{ "--tone": STATUS_TONE[task.status] } as CSSProperties}
      className="mx-auto flex w-full max-w-160 flex-1 flex-col 2xl:max-w-200"
    >
      <TaskNavBar
        back={back}
        pinned={task.pinnedToday}
        onTogglePin={() => onUpdate({ pinnedToday: !task.pinnedToday })}
        onDelete={onDelete && (() => setConfirmDelete(true))}
      />

      <div className="flex flex-col gap-6 pt-4 pb-10">
        <header className="flex flex-col gap-4">
          <h1 className="sr-only">{task.title}</h1>
          <TitleField
            title={task.title}
            done={done}
            flashTick={flash.title}
            onCommit={(title) => {
              onUpdate({ title });
              bumpFlash("title");
            }}
          />
          <TaskPropertyChips
            status={task.status}
            progressPct={progressDraft}
            priority={Number(task.priority)}
            dueDate={task.dueDate}
            completedAt={task.completedAt}
            overdue={overdue}
            flash={flash}
            onStatusChange={changeStatus}
            onRequestCompletion={requestCompletion}
            onBlocked={onBlocked}
            onOpenSheet={sheet.show}
            onMarkComplete={readyToComplete ? requestCompletion : undefined}
          />
        </header>

        <DescriptionField
          description={task.description}
          flashTick={flash.description}
          onCommit={(description) => {
            onUpdate({ description });
            bumpFlash("description");
          }}
        />

        <CommentLog comments={comments} />
      </div>

      <CommentComposer onAdd={addComment} />

      <TaskPropertySheet
        sheet={sheet.sheet}
        open={sheet.open}
        dueDate={task.dueDate}
        priority={Number(task.priority)}
        progressPct={progressDraft}
        completedAt={task.completedAt}
        canMarkComplete={readyToComplete}
        onClose={closeSheet}
        onPickDue={saveDueDate}
        onPriorityChange={prioritySave.schedule}
        onPrioritySettle={prioritySave.flush}
        onProgressChange={changeProgress}
        onPickCompletion={saveCompletion}
        onMarkComplete={requestCompletion}
      />

      {onDelete && (
        <ConfirmDialog
          open={confirmDelete}
          layout="compact"
          icon={<TrashIcon className="size-4" />}
          title="¿Eliminar esta tarea?"
          description="Se borrará junto a toda su bitácora. No se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={() => {
            setConfirmDelete(false);
            onDelete();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
