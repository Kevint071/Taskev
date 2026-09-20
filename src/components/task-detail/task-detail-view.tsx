"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Task, TaskComment } from "@/components/project-types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  BackIcon,
  CheckIcon,
  ChevronDownIcon,
  MoreIcon,
  SendIcon,
} from "@/components/ui/icons";
import { Popover } from "@/components/ui/popover";
import { STATUS_TONE } from "@/components/ui/status-badge";
import { daysBetweenUtc } from "@/lib/calendar";
import { MAX_TASK_TITLE_LENGTH } from "@/lib/constraints";
import {
  formatDayOffset,
  formatDueDate,
  formatDueDateWithWeekday,
  formatLongDate,
  formatTime,
} from "@/lib/format";
import { canCompleteAtProgress, PROGRESS_MAX } from "@/lib/progress";
import { isTempId, type SyncQueue, sendJson, tempId } from "@/lib/sync-queue";
import {
  CompletionPicker,
  DuePicker,
  PriorityStepper,
  ProgressRuler,
  StatusPicker,
} from "./task-pickers";

/** Task shape used within a `SyncQueue`-backed screen: `key` is stable across id resolution. */
export type LocalTask = Task & { key: string };

export type TaskUpdates = Partial<
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

type FlashKey =
  | "title"
  | "status"
  | "progress"
  | "priority"
  | "dueDate"
  | "completedAt"
  | "description";

// Rapid taps on the ruler or the stepper are coalesced into one save of the last value.
const DEFER_SAVE_MS = 400;

/**
 * Holds back a save while the user keeps adjusting a value: `schedule` restarts
 * the timer, `flush` saves right away, and leaving the screen flushes too.
 */
function useDeferredSave<T>(save: (value: T) => void) {
  const saveRef = useRef(save);
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current) {
      const { value } = pending.current;
      pending.current = null;
      saveRef.current(value);
    }
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, DEFER_SAVE_MS);
    },
    [flush],
  );

  useEffect(() => flush, [flush]);

  return { schedule, flush };
}

/** Wraps a field so it can briefly highlight right after a change is confirmed saved. */
function FlashWrap({
  tick,
  className = "rounded-control border-transparent",
  children,
}: {
  tick: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Restart the animation in place: remounting (e.g. via `key`) would drop the
  // inline height of autosized textareas and any focus inside.
  useEffect(() => {
    const el = ref.current;
    if (!el || tick === 0) return;
    el.classList.remove("animate-saved-flash");
    void el.offsetWidth;
    el.classList.add("animate-saved-flash");
  }, [tick]);

  return (
    <div
      ref={ref}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) {
          e.currentTarget.classList.remove("animate-saved-flash");
        }
      }}
      className={`border ${className}`}
    >
      {children}
    </div>
  );
}

/** One line of the property sheet: a quiet label, its control, and room to unfold more below. */
function PropertyRow({
  label,
  hint,
  below,
  children,
}: {
  label: string;
  hint?: string;
  below?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex min-h-13 items-center gap-4 py-2">
        <p title={hint} className="w-20 shrink-0 text-ui text-muted">
          {label}
        </p>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {below && <div className="animate-reveal pb-3">{below}</div>}
    </div>
  );
}

function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

/** Groups comments (assumed in chronological order) under one heading per calendar day. */
function groupCommentsByDay(
  comments: TaskComment[],
): { key: string; label: string; items: TaskComment[] }[] {
  const groups: { key: string; label: string; items: TaskComment[] }[] = [];
  for (const c of comments) {
    const d = new Date(c.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.items.push(c);
    } else {
      groups.push({ key, label: formatLongDate(d), items: [c] });
    }
  }
  return groups;
}

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
  /** Where the top-left arrow leads (usually the task's project). */
  back?: { href: string; label: string };
  onUpdate: (updates: TaskUpdates) => void;
  onBlocked: (message: string) => void;
  /** When provided, a delete action is offered in the "more" menu. */
  onDelete?: () => void;
}) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [description, setDescription] = useState(task.description ?? "");
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [progressDraft, setProgressDraft] = useState(task.progressPct);
  const [dueOpen, setDueOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const completionRef = useRef<HTMLDivElement>(null);

  const [flash, setFlash] = useState<Record<FlashKey, number>>({
    title: 0,
    status: 0,
    progress: 0,
    priority: 0,
    dueDate: 0,
    completedAt: 0,
    description: 0,
  });
  function bumpFlash(key: FlashKey) {
    setFlash((f) => ({ ...f, [key]: f[key] + 1 }));
  }

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

  // Resync local drafts if the task changes from outside (e.g. a reload).
  useEffect(() => setTitleDraft(task.title), [task.title]);
  useEffect(() => setDescription(task.description ?? ""), [task.description]);
  useEffect(() => setProgressDraft(task.progressPct), [task.progressPct]);
  // Re-fit whenever the text changes or the width does (fonts loading,
  // rotation, resizing), otherwise a stale height clips the last lines.
  useEffect(() => {
    autosize(titleRef.current);
  }, [titleDraft]);
  useEffect(() => {
    autosize(descriptionRef.current);
  }, [description]);
  useEffect(() => {
    const els = [titleRef.current, descriptionRef.current];
    const observer = new ResizeObserver(() => els.forEach(autosize));
    for (const el of els) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  function commitTitle() {
    const trimmed = titleDraft.trim().slice(0, MAX_TASK_TITLE_LENGTH);
    if (trimmed && trimmed !== task.title) {
      onUpdate({ title: trimmed });
      bumpFlash("title");
    } else {
      setTitleDraft(task.title);
    }
  }

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

  function changeProgress(next: number) {
    setProgressDraft(next);
    progressSave.schedule(next);
  }

  function openCompleting() {
    setCompleting(true);
    // Wait for the picker to mount so there is something to scroll to.
    requestAnimationFrame(() =>
      completionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      }),
    );
  }

  function pickStatus(next: Task["status"]) {
    if (next === task.status) return;
    // The status change must reach the server after the progress it depends on.
    progressSave.flush();
    if (next === "completada") {
      if (!canCompleteAtProgress(progressDraft)) {
        onBlocked("Sube el avance al 100% para poder completar la tarea.");
        return;
      }
      openCompleting();
      return;
    }
    setCompleting(false);
    onUpdate({ status: next, completedAt: null });
    bumpFlash("status");
  }

  function saveCompletion(date: Date) {
    const completedAt = date.toISOString();
    setCompleting(false);
    if (task.status === "completada") {
      if (completedAt !== task.completedAt) {
        onUpdate({ completedAt });
        bumpFlash("completedAt");
      }
    } else {
      onUpdate({ status: "completada", completedAt });
      bumpFlash("status");
    }
  }

  function saveDueDate(date: Date | null) {
    const dueDate = date ? date.toISOString() : null;
    setDueOpen(false);
    if (dueDate === task.dueDate) return;
    onUpdate({ dueDate });
    bumpFlash("dueDate");
  }

  const commentGroups = groupCommentsByDay(comments);
  const done = task.status === "completada";
  const priority = Number(task.priority);
  const dueOffset = task.dueDate
    ? daysBetweenUtc(new Date(task.dueDate))
    : null;
  const overdue = dueOffset !== null && dueOffset < 0 && !done;
  const readyToComplete = progressDraft >= PROGRESS_MAX && !done;

  return (
    <div
      style={{ "--tone": STATUS_TONE[task.status] } as CSSProperties}
      className="flex w-full max-w-[640px] flex-1 flex-col"
    >
      <div className="-mx-2 flex h-11 items-center justify-between">
        {back ? (
          <Link
            href={back.href}
            className="inline-flex h-11 min-w-0 items-center gap-0.5 rounded-[14px] pr-3 pl-1.5 text-ui font-medium text-muted transition-colors hover:text-ink"
          >
            <BackIcon />
            <span className="truncate">{back.label}</span>
          </Link>
        ) : (
          <span />
        )}
        {onDelete && (
          <Popover
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            className="shrink-0"
          >
            <button
              type="button"
              aria-label="Más acciones"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              <MoreIcon />
            </button>
            {menuOpen && (
              <div
                role="menu"
                aria-label="Acciones de la tarea"
                className="animate-reveal absolute top-12 right-0 z-30 w-52 rounded-panel border border-line bg-raised p-1.5 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                  className="flex h-11 w-full items-center rounded-control px-3 text-left text-ui font-medium text-danger transition-colors hover:bg-danger/10"
                >
                  Eliminar tarea
                </button>
              </div>
            )}
          </Popover>
        )}
      </div>

      <div className="flex flex-col gap-6 pt-3 pb-10">
        <FlashWrap tick={flash.title}>
          <label className="block">
            <span className="sr-only">Título de la tarea</span>
            <textarea
              ref={titleRef}
              value={titleDraft}
              onChange={(e) => {
                setTitleDraft(e.target.value);
                autosize(e.target);
              }}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  setTitleDraft(task.title);
                }
              }}
              rows={1}
              maxLength={MAX_TASK_TITLE_LENGTH}
              className="-mx-1 block w-full resize-none overflow-hidden rounded-[4px] bg-transparent px-1 text-[24px] leading-[30px] font-semibold tracking-[-0.02em] text-balance text-ink caret-accent outline-none sm:text-page"
            />
          </label>
        </FlashWrap>

        <div className="flex flex-col gap-2">
          <FlashWrap
            tick={flash.status}
            className="rounded-xl border-transparent"
          >
            <StatusPicker
              status={task.status}
              progressPct={progressDraft}
              completedAt={task.completedAt}
              onPick={pickStatus}
              onLocked={onBlocked}
            />
          </FlashWrap>

          <FlashWrap
            tick={flash.progress}
            className="rounded-xl border-transparent"
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <ProgressRuler
                  value={progressDraft}
                  onChange={changeProgress}
                />
              </div>
              <p
                aria-live="polite"
                className="tabular w-10 shrink-0 text-right text-[15px] font-medium"
              >
                {progressDraft}
                <span className="text-muted">%</span>
              </p>
            </div>
          </FlashWrap>

          {readyToComplete && !completing && (
            <button
              type="button"
              onClick={() => {
                progressSave.flush();
                openCompleting();
              }}
              className="mt-1 inline-flex h-9 w-fit items-center gap-1.5 rounded-full bg-status-done px-4 text-ui font-semibold text-accent-ink transition-opacity hover:opacity-90"
            >
              <CheckIcon />
              Marcar completada
            </button>
          )}

          {done && task.completedAt && !completing && (
            <FlashWrap
              tick={flash.completedAt}
              className="w-fit rounded-full border-transparent"
            >
              <p className="flex items-center gap-1 text-ui text-muted">
                Finalizada el {formatDueDate(task.completedAt)}
                <button
                  type="button"
                  onClick={openCompleting}
                  className="h-8 rounded-full px-2.5 font-medium text-accent hover:bg-accent-soft"
                >
                  Cambiar
                </button>
              </p>
            </FlashWrap>
          )}

          {completing && (
            <div
              ref={completionRef}
              className="animate-reveal mt-1 scroll-mb-28 rounded-2xl bg-sunken/70 p-3"
            >
              <CompletionPicker
                value={task.completedAt}
                onPick={saveCompletion}
                onCancel={() => setCompleting(false)}
              />
            </div>
          )}
        </div>

        <div className="divide-y divide-line border-y border-line">
          <PropertyRow
            label="Fecha"
            below={
              dueOpen ? (
                <DuePicker value={task.dueDate} onPick={saveDueDate} />
              ) : undefined
            }
          >
            <FlashWrap
              tick={flash.dueDate}
              className="w-fit rounded-full border-transparent"
            >
              <button
                type="button"
                aria-expanded={dueOpen}
                onClick={() => setDueOpen((o) => !o)}
                className={`-ml-3 inline-flex h-9 items-center gap-2 rounded-full px-3 text-ui font-medium transition-colors hover:bg-sunken ${
                  overdue ? "text-danger" : ""
                }`}
              >
                {task.dueDate ? (
                  <>
                    {formatDueDateWithWeekday(task.dueDate)}
                    {dueOffset !== null && !done && (
                      <span
                        className={`font-normal ${overdue ? "" : "text-muted"}`}
                      >
                        {formatDayOffset(dueOffset)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted">Sin fecha</span>
                )}
                <ChevronDownIcon
                  className={`text-muted transition-transform ${dueOpen ? "rotate-180" : ""}`}
                />
              </button>
            </FlashWrap>
          </PropertyRow>

          <PropertyRow
            label="Prioridad"
            hint="Pesa en el orden de Hoy junto con la fecha y el avance."
          >
            <FlashWrap
              tick={flash.priority}
              className="w-fit rounded-full border-transparent"
            >
              <PriorityStepper
                value={priority}
                onChange={prioritySave.schedule}
                onSettle={prioritySave.flush}
              />
            </FlashWrap>
          </PropertyRow>
        </div>

        <FlashWrap
          tick={flash.description}
          className="rounded-lg border-transparent"
        >
          <label className="block">
            <span className="sr-only">Descripción</span>
            <textarea
              ref={descriptionRef}
              value={description}
              placeholder="Añade notas, contexto, enlaces…"
              onChange={(e) => {
                setDescription(e.target.value);
                autosize(e.target);
              }}
              onBlur={() => {
                if (description !== (task.description ?? "")) {
                  onUpdate({ description });
                  bumpFlash("description");
                }
              }}
              rows={2}
              className="-mx-2 block min-h-14 w-[calc(100%+1rem)] resize-none overflow-hidden rounded-lg bg-transparent px-2 py-1.5 text-[15px] leading-6 caret-accent transition-colors outline-none placeholder:text-muted/80 hover:bg-sunken/60 focus-visible:bg-sunken/60"
            />
          </label>
        </FlashWrap>

        <section
          className="flex flex-col gap-5 border-t border-line pt-6"
          aria-label="Bitácora"
        >
          <h2 className="text-ui font-semibold">
            Bitácora
            {comments.length > 0 && (
              <span className="tabular ml-1.5 font-normal text-muted">
                {comments.length}
              </span>
            )}
          </h2>
          {comments.length === 0 && (
            <p className="text-ui text-muted">
              Aún no hay entradas. Anota aquí qué avanzó o qué cambió.
            </p>
          )}
          {commentGroups.map((group) => (
            <div key={group.key} className="flex flex-col gap-3">
              <p className="text-meta font-medium text-muted first-letter:uppercase">
                {group.label}
              </p>
              <ol className="flex flex-col gap-3">
                {group.items.map((c) => (
                  <li
                    key={c.id}
                    className={`grid grid-cols-[3rem_1fr] gap-3 ${isTempId(c.id) ? "opacity-70" : ""}`}
                  >
                    <time
                      dateTime={c.createdAt}
                      className="tabular pt-0.5 text-meta text-muted"
                    >
                      {formatTime(c.createdAt)}
                    </time>
                    <p className="text-[15px] leading-6 break-words whitespace-pre-wrap">
                      {c.body}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      </div>

      <form
        onSubmit={handleAddComment}
        className="sticky bottom-0 z-10 mt-auto bg-linear-to-t from-surface from-65% to-transparent pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center gap-1 rounded-full border border-line-strong bg-raised p-1 pl-4 shadow-lg shadow-black/5 transition-colors focus-within:border-accent">
          <input
            type="text"
            aria-label="Nueva entrada en la bitácora"
            placeholder="Añadir a la bitácora"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="h-9 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            aria-label="Añadir entrada"
            disabled={!newComment.trim()}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent/90 disabled:bg-line disabled:text-muted"
          >
            <SendIcon className="size-[18px]" />
          </button>
        </div>
      </form>

      {onDelete && (
        <ConfirmDialog
          open={confirmDelete}
          title="¿Eliminar esta tarea?"
          description={
            <>
              Se borrará <strong className="text-ink">{task.title}</strong> y
              toda su bitácora. No se puede deshacer.
            </>
          }
          confirmLabel="Eliminar tarea"
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
