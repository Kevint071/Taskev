"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  STATUS_LABELS,
  type Task,
  type TaskComment,
} from "@/components/group-types";
import { type StatusChange, StatusMenu } from "@/components/tasks/status-menu";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  BackIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  FlagIcon,
  PinIcon,
  SendIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { STATUS_TONE, StatusDot } from "@/components/ui/status-badge";
import { daysBetweenUtc } from "@/lib/calendar";
import { MAX_TASK_TITLE_LENGTH } from "@/lib/constraints";
import {
  formatDueDate,
  formatDueDateForTaskChip,
  formatLongDate,
  formatPriority,
  formatTime,
} from "@/lib/format";
import { PROGRESS_MAX } from "@/lib/progress";
import { isTempId, type SyncQueue, sendJson, tempId } from "@/lib/sync-queue";
import {
  CompletionPicker,
  DuePicker,
  PriorityStepper,
  ProgressSlider,
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
    | "pinnedToday"
  >
> & { priority?: number };

type FlashKey =
  | "title"
  | "progress"
  | "priority"
  | "dueDate"
  | "completedAt"
  | "description";

/** Each property opens its own contextual sheet instead of sitting on the page as an input. */
type SheetKey = "due" | "priority" | "progress" | "completion";

const SHEET_TITLES: Record<SheetKey, string> = {
  due: "Fecha",
  priority: "Prioridad",
  progress: "Avance",
  completion: "¿Cuándo se completó?",
};

// Rapid taps on the slider or the stepper are coalesced into one save of the last value.
const DEFER_SAVE_MS = 400;

// The log opens on its latest entries; the rest unfold on demand.
const LOG_PREVIEW_COUNT = 3;

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

/**
 * One property of the task as a pill under the title, tinted by `tone` when
 * it has one. Opens its sheet when tapped.
 */
export function PropertyChip({
  icon,
  tone,
  label,
  appearance = "default",
  expanded,
  onClick,
  children,
}: {
  icon: ReactNode;
  /** CSS color the pill's background, border and icon are mixed from. */
  tone?: string;
  appearance?: "default" | "quiet" | "select";
  /** Accessible name, since the visible text is only the value. */
  label: string;
  /** Set when the chip opens a dropdown menu instead of a sheet. */
  expanded?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-haspopup={expanded === undefined ? "dialog" : "true"}
      aria-expanded={expanded}
      aria-label={label}
      onClick={onClick}
      style={tone ? ({ "--chip": tone } as CSSProperties) : undefined}
      className={`inline-flex h-9 max-w-full items-center gap-2 rounded-full border text-ui font-medium whitespace-nowrap transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.97] ${
        appearance === "quiet"
          ? "border-transparent bg-transparent pr-2.5 pl-0 text-muted hover:bg-sunken/70 hover:text-ink [&>svg]:text-muted"
          : appearance === "select"
            ? "border-transparent bg-transparent pr-3 pl-0 text-ink hover:bg-sunken/60 [&>svg]:text-(--chip)"
            : tone
              ? "border-[color-mix(in_srgb,var(--chip)_28%,transparent)] bg-[color-mix(in_srgb,var(--chip)_12%,var(--raised))] pr-3.5 pl-0 hover:bg-[color-mix(in_srgb,var(--chip)_20%,var(--raised))] [&>svg]:text-(--chip)"
              : "border-line bg-raised pr-3.5 pl-0 shadow-panel hover:border-line-strong hover:bg-sunken/60 [&>svg]:text-muted"
      }`}
    >
      {icon}
      {children}
      {appearance === "select" && (
        <ChevronDownIcon className="size-3.5 shrink-0 text-muted" />
      )}
    </button>
  );
}

export function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  // Measure without a scrollbar: at the collapsed "auto" height one appears,
  // narrows the text, and the extra wrapping leaves a phantom blank line.
  el.style.overflowY = "hidden";
  el.style.height = "auto";
  const borderHeight = el.offsetHeight - el.clientHeight;
  el.style.height = `${el.scrollHeight + borderHeight}px`;
  el.style.overflowY = "";
}

function centerTextareaEnd(el: HTMLTextAreaElement | null) {
  if (!el || el.selectionStart !== el.value.length) return;
  const maxScrollTop = el.scrollHeight - el.clientHeight;
  el.scrollTop = maxScrollTop - Math.min(el.clientHeight / 2, maxScrollTop);
}

/** "Hoy", "Ayer", or the full weekday and date. */
function dayLabel(d: Date, now = new Date()): string {
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return formatLongDate(d);
}

/** Groups consecutive comments under one heading per calendar day, in the order given. */
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
      groups.push({ key, label: dayLabel(d), items: [c] });
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
  /** Where the top-left arrow leads (usually the task's group). */
  back?: { href: string; label: string };
  onUpdate: (updates: TaskUpdates) => void;
  onBlocked: (message: string) => void;
  /** When provided, a delete action is offered in the "more" menu. */
  onDelete?: () => void;
}) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [description, setDescription] = useState(task.description ?? "");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [progressDraft, setProgressDraft] = useState(task.progressPct);
  const [showAllLog, setShowAllLog] = useState(false);
  // `sheet` outlives `sheetOpen` so the title doesn't blank while the sheet closes.
  const [sheet, setSheet] = useState<SheetKey>("due");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const cancelDescriptionEdit = useRef(false);

  const [flash, setFlash] = useState<Record<FlashKey, number>>({
    title: 0,
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: Draft changes trigger sizing after React updates the controlled textarea.
  useEffect(() => {
    autosize(titleRef.current);
  }, [titleDraft]);
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => autosize(el));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    autosize(el);
    const observer = new ResizeObserver(() => autosize(el));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Draft changes trigger sizing after React updates the controlled textarea.
  useEffect(() => {
    const el = descriptionRef.current;
    autosize(el);
    if (document.activeElement === el) centerTextareaEnd(el);
  }, [description, descriptionExpanded]);

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

  function commitDescription() {
    if (cancelDescriptionEdit.current) {
      cancelDescriptionEdit.current = false;
      setDescription(task.description ?? "");
      return;
    }
    if (description !== (task.description ?? "")) {
      onUpdate({ description });
      bumpFlash("description");
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
    // Shrink the composer back to one line now that it is empty.
    if (composerRef.current) composerRef.current.style.height = "auto";

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

  function openSheet(next: SheetKey) {
    setSheet(next);
    setSheetOpen(true);
  }

  function closeSheet() {
    progressSave.flush();
    prioritySave.flush();
    setSheetOpen(false);
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
    openSheet("completion");
  }

  function saveCompletion(date: Date) {
    const completedAt = date.toISOString();
    setSheetOpen(false);
    if (task.status === "completada") {
      if (completedAt !== task.completedAt) {
        onUpdate({ completedAt });
        bumpFlash("completedAt");
      }
    } else {
      onUpdate({ status: "completada", completedAt });
    }
  }

  function togglePin() {
    onUpdate({ pinnedToday: !task.pinnedToday });
  }

  function saveDueDate(date: Date | null) {
    const dueDate = date ? date.toISOString() : null;
    setSheetOpen(false);
    if (dueDate === task.dueDate) return;
    onUpdate({ dueDate });
    bumpFlash("dueDate");
  }

  const done = task.status === "completada";
  const priority = Number(task.priority);
  const dueOffset = task.dueDate
    ? daysBetweenUtc(new Date(task.dueDate))
    : null;
  const overdue = dueOffset !== null && dueOffset < 0 && !done;
  const readyToComplete = progressDraft >= PROGRESS_MAX && !done;

  // Newest first, so the latest entry is the first thing under the heading.
  const newestFirst = [...comments].reverse();
  const hiddenLogCount = Math.max(0, newestFirst.length - LOG_PREVIEW_COUNT);
  const visibleLog = showAllLog
    ? newestFirst
    : newestFirst.slice(0, LOG_PREVIEW_COUNT);
  const logGroups = groupCommentsByDay(visibleLog);

  return (
    <div
      style={{ "--tone": STATUS_TONE[task.status] } as CSSProperties}
      className="mx-auto flex w-full max-w-[640px] flex-1 flex-col 2xl:max-w-[800px]"
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
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={togglePin}
            aria-pressed={task.pinnedToday}
            aria-label={
              task.pinnedToday
                ? "Quitar de las prioridades de hoy"
                : "Fijar para hoy"
            }
            title={
              task.pinnedToday
                ? "Quitar de las prioridades de hoy"
                : "Fijar para hoy"
            }
            className={`flex size-11 items-center justify-center rounded-full transition-colors ${
              task.pinnedToday
                ? "text-accent hover:bg-accent-soft"
                : "text-muted hover:bg-sunken hover:text-ink"
            }`}
          >
            <PinIcon filled={task.pinnedToday} className="size-[18px]" />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Eliminar tarea"
              title="Eliminar tarea"
              className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <TrashIcon className="size-[18px]" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 pt-4 pb-10">
        <header className="flex flex-col gap-4">
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
                className={`-mx-1 block w-full resize-none overflow-hidden rounded-[4px] bg-transparent px-1 text-[23px] leading-[29px] font-semibold tracking-[-0.02em] text-pretty caret-accent outline-none sm:text-page ${
                  done ? "text-muted line-through decoration-1" : "text-ink"
                }`}
              />
            </label>
          </FlashWrap>

          <section
            aria-label="Detalles"
            className="flex flex-wrap items-center gap-2"
          >
            {/* Same transparent border as the FlashWrap chips, so they line up; the
                status chip itself doesn't flash on save. */}
            <div className="max-w-full rounded-full border border-transparent">
              <StatusMenu
                status={task.status}
                progressPct={progressDraft}
                completedAt={task.completedAt}
                onChange={changeStatus}
                onComplete={requestCompletion}
                onBlocked={onBlocked}
                trigger={({ open, toggle }) => (
                  <PropertyChip
                    label={`Estado: ${STATUS_LABELS[task.status]}`}
                    icon={<StatusDot status={task.status} />}
                    tone="var(--tone)"
                    appearance="select"
                    expanded={open}
                    onClick={toggle}
                  >
                    {STATUS_LABELS[task.status]}
                  </PropertyChip>
                )}
              />
            </div>

            <FlashWrap
              tick={flash.dueDate}
              className="max-w-full rounded-full border-transparent"
            >
              <PropertyChip
                label={
                  task.dueDate
                    ? `Fecha: ${formatDueDateForTaskChip(task.dueDate)}`
                    : "Fecha: sin fecha"
                }
                icon={<CalendarIcon className="text-current" />}
                tone={overdue ? "var(--danger)" : undefined}
                appearance="quiet"
                onClick={() => openSheet("due")}
              >
                {task.dueDate ? (
                  <span className="truncate">
                    {formatDueDateForTaskChip(task.dueDate)}
                  </span>
                ) : (
                  <span className="font-normal text-muted">Sin fecha</span>
                )}
              </PropertyChip>
            </FlashWrap>

            <FlashWrap
              tick={flash.progress}
              className="max-w-full rounded-full border-transparent"
            >
              <PropertyChip
                label={`Avance: ${progressDraft} %`}
                icon={
                  <span
                    aria-hidden="true"
                    style={{
                      background: `conic-gradient(var(--tone) ${progressDraft}%, var(--line-strong) 0)`,
                    }}
                    className="flex size-4 shrink-0 items-center justify-center rounded-full"
                  >
                    <span className="size-2 rounded-full bg-raised" />
                  </span>
                }
                appearance="quiet"
                onClick={() => openSheet("progress")}
              >
                <span className="tabular">{progressDraft} %</span>
              </PropertyChip>
            </FlashWrap>

            <FlashWrap
              tick={flash.priority}
              className="max-w-full rounded-full border-transparent"
            >
              <PropertyChip
                label={`Prioridad: ${formatPriority(priority)}`}
                icon={<FlagIcon className="text-current" />}
                appearance="quiet"
                onClick={() => openSheet("priority")}
              >
                <span className="tabular">{formatPriority(priority)}</span>
              </PropertyChip>
            </FlashWrap>

            {readyToComplete && (
              <button
                type="button"
                onClick={requestCompletion}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-status-done px-3.5 text-ui font-semibold text-accent-ink transition-opacity hover:opacity-90"
              >
                <CheckIcon />
                Marcar completada
              </button>
            )}

            {done && task.completedAt && (
              <FlashWrap
                tick={flash.completedAt}
                className="max-w-full rounded-full border-transparent"
              >
                <PropertyChip
                  label={`Finalizada el ${formatDueDate(task.completedAt)}`}
                  icon={<CheckIcon className="text-current" />}
                  appearance="quiet"
                  onClick={() => openSheet("completion")}
                >
                  Finalizada el {formatDueDate(task.completedAt)}
                </PropertyChip>
              </FlashWrap>
            )}
          </section>
        </header>

        <section aria-label="Descripción" className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-ui font-semibold text-ink">Descripción</h2>
            <button
              type="button"
              aria-label={
                descriptionExpanded
                  ? "Contraer descripción"
                  : "Expandir descripción"
              }
              aria-expanded={descriptionExpanded}
              aria-controls="task-description"
              title={
                descriptionExpanded
                  ? "Contraer descripción"
                  : "Expandir descripción"
              }
              onClick={() => setDescriptionExpanded((expanded) => !expanded)}
              className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              <ChevronDownIcon
                className={`size-4 transition-transform ${descriptionExpanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>
          <FlashWrap
            tick={flash.description}
            className="rounded-xl border-transparent"
          >
            <label className="block">
              <span className="sr-only">Descripción</span>
              <textarea
                id="task-description"
                ref={descriptionRef}
                value={description}
                placeholder="Añade notas, contexto, enlaces…"
                onChange={(e) => {
                  setDescription(e.target.value);
                  autosize(e.target);
                  centerTextareaEnd(e.target);
                }}
                onBlur={commitDescription}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelDescriptionEdit.current = true;
                    e.currentTarget.blur();
                  }
                }}
                rows={3}
                className={`description-scrollbar block min-h-24 w-full resize-none overflow-y-auto rounded-xl border border-line bg-sunken/55 px-4 py-3 text-[15px] leading-7 text-ink caret-accent transition-[background-color,border-color,box-shadow] placeholder:text-muted/80 hover:border-line-strong focus:border-accent focus:bg-raised focus-visible:ring-2 focus-visible:ring-accent/15 ${descriptionExpanded ? "max-h-[440px]" : "max-h-[160px]"}`}
              />
            </label>
          </FlashWrap>
        </section>

        <section className="mt-3 flex flex-col gap-4" aria-label="Bitácora">
          <h2 className="text-[15px] font-semibold">
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
          {logGroups.map((group) => (
            <div key={group.key} className="flex flex-col gap-3">
              <p className="text-meta font-medium text-muted first-letter:uppercase">
                {group.label}
              </p>
              <ol className="ml-[3px] flex flex-col gap-4 border-l border-line pl-4">
                {group.items.map((c) => (
                  <li
                    key={c.id}
                    className={`relative ${isTempId(c.id) ? "opacity-70" : ""}`}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute top-2 -left-[19.5px] size-[7px] rounded-full bg-line-strong"
                    />
                    <time
                      dateTime={c.createdAt}
                      className="tabular block text-meta text-muted"
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
          {hiddenLogCount > 0 && (
            <button
              type="button"
              aria-expanded={showAllLog}
              onClick={() => setShowAllLog((s) => !s)}
              className="-ml-2 inline-flex h-9 w-fit items-center rounded-full px-3 text-ui font-medium text-accent transition-colors hover:bg-accent-soft"
            >
              {showAllLog
                ? "Mostrar menos"
                : `Ver ${hiddenLogCount} ${hiddenLogCount === 1 ? "anterior" : "anteriores"}`}
            </button>
          )}
        </section>
      </div>

      <form
        onSubmit={handleAddComment}
        className="sticky bottom-0 z-10 mt-auto bg-linear-to-t from-surface from-65% to-transparent pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-end gap-1 rounded-3xl border border-line-strong bg-raised py-1 pr-1 pl-4 shadow-lg shadow-black/5 transition-colors focus-within:border-accent">
          <textarea
            ref={composerRef}
            rows={1}
            enterKeyHint="send"
            aria-label="Nueva nota en la bitácora"
            placeholder="Añadir una nota…"
            value={newComment}
            onChange={(e) => {
              setNewComment(e.target.value);
              autosize(e.target);
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            className="max-h-36 min-h-9 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1.5 text-[15px] leading-6 text-ink caret-accent outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            aria-label="Añadir nota"
            disabled={!newComment.trim()}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent/90 disabled:bg-line disabled:text-muted"
          >
            <SendIcon className="size-[18px]" />
          </button>
        </div>
      </form>

      <BottomSheet
        open={sheetOpen}
        title={SHEET_TITLES[sheet]}
        onClose={closeSheet}
      >
        {sheetOpen && sheet === "due" && (
          <DuePicker value={task.dueDate} onPick={saveDueDate} />
        )}
        {sheetOpen && sheet === "priority" && (
          <div className="flex flex-col items-center gap-4 pt-2 pb-2">
            <PriorityStepper
              value={priority}
              onChange={prioritySave.schedule}
              onSettle={prioritySave.flush}
            />
            <p className="max-w-[30ch] text-center text-meta text-balance text-muted">
              Cuanto mayor, antes aparece en Hoy. Pesa junto con la fecha y el
              avance.
            </p>
          </div>
        )}
        {sheetOpen && sheet === "progress" && (
          <div className="flex flex-col gap-2 pb-2">
            <p
              aria-live="polite"
              className="tabular text-center text-[40px] leading-[44px] font-semibold tracking-[-0.03em]"
            >
              {progressDraft}
              <span className="text-muted">%</span>
            </p>
            <ProgressSlider value={progressDraft} onChange={changeProgress} />
            {readyToComplete && (
              <button
                type="button"
                onClick={requestCompletion}
                className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-status-done px-5 text-ui font-semibold text-accent-ink transition-opacity hover:opacity-90"
              >
                <CheckIcon />
                Marcar completada
              </button>
            )}
          </div>
        )}
        {sheetOpen && sheet === "completion" && (
          <CompletionPicker value={task.completedAt} onPick={saveCompletion} />
        )}
      </BottomSheet>

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
