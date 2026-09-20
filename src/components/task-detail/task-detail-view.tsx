"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  STATUS_LABELS,
  type Task,
  type TaskComment,
} from "@/components/project-types";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  BackIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FlagIcon,
  MoreIcon,
  ProgressGaugeIcon,
  SendIcon,
} from "@/components/ui/icons";
import { Popover } from "@/components/ui/popover";
import { STATUS_TONE, StatusDot } from "@/components/ui/status-badge";
import { daysBetweenUtc } from "@/lib/calendar";
import { MAX_TASK_TITLE_LENGTH } from "@/lib/constraints";
import {
  formatDayOffset,
  formatDueDate,
  formatDueDateWithWeekday,
  formatLongDate,
  formatPriority,
  formatTime,
} from "@/lib/format";
import { canCompleteAtProgress, PROGRESS_MAX } from "@/lib/progress";
import { isTempId, type SyncQueue, sendJson, tempId } from "@/lib/sync-queue";
import {
  CompletionPicker,
  DuePicker,
  PriorityStepper,
  ProgressSlider,
  StatusOptions,
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

/** Each property opens its own contextual sheet instead of sitting on the page as an input. */
type SheetKey = "status" | "due" | "priority" | "progress" | "completion";

const SHEET_TITLES: Record<SheetKey, string> = {
  status: "Estado",
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
 * The task's own checkbox: a ring that fills with the progress and turns into a
 * solid check once completed. It is also the main action of the screen.
 */
function CompletionRing({
  pct,
  done,
  ready,
  onClick,
}: {
  pct: number;
  done: boolean;
  /** Progress is full but the task is not marked completed yet. */
  ready: boolean;
  onClick: () => void;
}) {
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  return (
    <button
      type="button"
      aria-label={done ? "Reabrir la tarea" : "Completar la tarea"}
      onClick={onClick}
      className="group/ring relative mt-0.5 size-7 shrink-0 rounded-full after:absolute after:-inset-2.5 after:content-['']"
    >
      <svg viewBox="0 0 28 28" className="size-7 -rotate-90" aria-hidden="true">
        <circle
          cx="14"
          cy="14"
          r={radius}
          fill={done ? "var(--tone)" : "none"}
          stroke="color-mix(in srgb, var(--tone) 24%, transparent)"
          strokeWidth="2.5"
          className="transition-[fill] duration-300"
        />
        {!done && pct > 0 && (
          <circle
            cx="14"
            cy="14"
            r={radius}
            fill="none"
            stroke="var(--tone)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / PROGRESS_MAX)}
            className="transition-[stroke-dashoffset] duration-300"
          />
        )}
      </svg>
      <CheckIcon
        className={`absolute inset-0 m-auto transition-opacity ${
          done
            ? "size-4 text-accent-ink"
            : `size-3.5 text-(--tone) ${
                ready
                  ? "opacity-80"
                  : "opacity-0 group-hover/ring:opacity-40 group-focus-visible/ring:opacity-40"
              }`
        }`}
      />
    </button>
  );
}

/** One property of the task: reads as a sentence, and opens its sheet when tapped. */
function PropertyButton({
  icon,
  danger = false,
  onClick,
  children,
}: {
  icon: ReactNode;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onClick}
      className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-[15px] transition-colors hover:bg-sunken/70 active:bg-sunken ${
        danger ? "text-danger" : ""
      }`}
    >
      <span className={danger ? "" : "text-muted"}>{icon}</span>
      {children}
      <ChevronRightIcon className="ml-auto text-muted/60" />
    </button>
  );
}

function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
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
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [progressDraft, setProgressDraft] = useState(task.progressPct);
  const [showAllLog, setShowAllLog] = useState(false);
  // `sheet` outlives `sheetOpen` so the title doesn't blank while the sheet closes.
  const [sheet, setSheet] = useState<SheetKey>("status");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const cancelDescriptionEdit = useRef(false);

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
    const el = titleRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => autosize(el));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // The description textarea only exists while editing, so it is fitted on mount.
  useEffect(() => {
    const el = descriptionRef.current;
    if (!editingDescription || !el) return;
    autosize(el);
    const observer = new ResizeObserver(() => autosize(el));
    observer.observe(el);
    return () => observer.disconnect();
  }, [editingDescription]);
  useEffect(() => {
    autosize(descriptionRef.current);
  }, [description]);

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
    setEditingDescription(false);
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

  function pickStatus(next: Task["status"]) {
    if (next === task.status) {
      closeSheet();
      return;
    }
    // The status change must reach the server after the progress it depends on.
    progressSave.flush();
    if (next === "completada") {
      if (!canCompleteAtProgress(progressDraft)) {
        onBlocked("Sube el avance al 100% para poder completar la tarea.");
        return;
      }
      openSheet("completion");
      return;
    }
    setSheetOpen(false);
    onUpdate({ status: next, completedAt: null });
    bumpFlash("status");
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
      bumpFlash("status");
    }
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

      <div className="flex flex-col gap-9 pt-4 pb-10">
        <header className="grid grid-cols-[28px_1fr] gap-x-3 gap-y-3">
          <CompletionRing
            pct={progressDraft}
            done={done}
            ready={readyToComplete}
            onClick={() => pickStatus(done ? "en_curso" : "completada")}
          />

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
                className={`-mx-1 block w-full resize-none overflow-hidden rounded-[4px] bg-transparent px-1 text-[24px] leading-[30px] font-semibold tracking-[-0.02em] text-balance caret-accent outline-none sm:text-page ${
                  done ? "text-muted line-through decoration-1" : "text-ink"
                }`}
              />
            </label>
          </FlashWrap>

          <div className="col-start-2 flex flex-wrap items-center gap-2">
            <FlashWrap
              tick={flash.status}
              className="w-fit rounded-full border-transparent"
            >
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => openSheet("status")}
                className="inline-flex h-8 items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--tone)_13%,var(--raised))] pr-2.5 pl-3 text-ui font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--tone)_20%,var(--raised))]"
              >
                <StatusDot status={task.status} />
                {STATUS_LABELS[task.status]}
                <ChevronDownIcon className="-mr-0.5 text-muted" />
              </button>
            </FlashWrap>

            {readyToComplete && (
              <button
                type="button"
                onClick={() => pickStatus("completada")}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-status-done px-3.5 text-ui font-semibold text-accent-ink transition-opacity hover:opacity-90"
              >
                <CheckIcon />
                Marcar completada
              </button>
            )}
          </div>

          <div className="col-start-2">
            <FlashWrap
              tick={flash.description}
              className="rounded-xl border-transparent"
            >
              {editingDescription ? (
                <label className="block">
                  <span className="sr-only">Descripción</span>
                  <textarea
                    ref={descriptionRef}
                    // biome-ignore lint/a11y/noAutofocus: the user just tapped the text to edit it
                    autoFocus
                    value={description}
                    placeholder="Añade notas, contexto, enlaces…"
                    onFocus={(e) => {
                      const end = e.currentTarget.value.length;
                      e.currentTarget.setSelectionRange(end, end);
                    }}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      autosize(e.target);
                    }}
                    onBlur={commitDescription}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelDescriptionEdit.current = true;
                        e.currentTarget.blur();
                      }
                    }}
                    rows={2}
                    className="-mx-2 block min-h-14 w-[calc(100%+1rem)] resize-none overflow-hidden rounded-xl bg-sunken/70 px-2 py-1.5 text-[15px] leading-6 caret-accent outline-none placeholder:text-muted/80"
                  />
                </label>
              ) : (
                <button
                  type="button"
                  aria-label="Editar la descripción"
                  onClick={() => setEditingDescription(true)}
                  className="-mx-2 block min-h-11 w-[calc(100%+1rem)] rounded-xl px-2 py-1.5 text-left text-[15px] leading-6 break-words whitespace-pre-wrap transition-colors hover:bg-sunken/60"
                >
                  {description || (
                    <span className="text-muted/80">
                      Añade notas, contexto, enlaces…
                    </span>
                  )}
                </button>
              )}
            </FlashWrap>
          </div>
        </header>

        <section
          aria-label="Detalles"
          className="rounded-3xl bg-raised p-1.5 shadow-panel"
        >
          <FlashWrap
            tick={flash.dueDate}
            className="rounded-2xl border-transparent"
          >
            <PropertyButton
              icon={<CalendarIcon className="text-current" />}
              danger={overdue}
              onClick={() => openSheet("due")}
            >
              {task.dueDate ? (
                <span className="min-w-0 truncate">
                  <span className="font-medium">
                    {formatDueDateWithWeekday(task.dueDate)}
                  </span>
                  {dueOffset !== null && !done && (
                    <span className={overdue ? "" : "text-muted"}>
                      {" "}
                      · {formatDayOffset(dueOffset)}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-muted">Sin fecha</span>
              )}
            </PropertyButton>
          </FlashWrap>

          <FlashWrap
            tick={flash.priority}
            className="rounded-2xl border-transparent"
          >
            <PropertyButton
              icon={<FlagIcon className="text-current" />}
              onClick={() => openSheet("priority")}
            >
              <span className="font-medium">
                Prioridad {formatPriority(priority)}
              </span>
            </PropertyButton>
          </FlashWrap>

          <FlashWrap
            tick={flash.progress}
            className="rounded-2xl border-transparent"
          >
            <PropertyButton
              icon={<ProgressGaugeIcon className="text-current" />}
              onClick={() => openSheet("progress")}
            >
              <span className="tabular font-medium">
                {progressDraft} % completado
              </span>
              <span
                aria-hidden="true"
                className="ml-auto h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-line-strong/50"
              >
                <span
                  style={{ width: `${progressDraft}%` }}
                  className="block h-full rounded-full bg-(--tone) transition-[width] duration-300"
                />
              </span>
            </PropertyButton>
          </FlashWrap>

          {done && task.completedAt && (
            <FlashWrap
              tick={flash.completedAt}
              className="rounded-2xl border-transparent"
            >
              <PropertyButton
                icon={<CheckIcon className="text-current" />}
                onClick={() => openSheet("completion")}
              >
                <span className="font-medium">
                  Finalizada el {formatDueDate(task.completedAt)}
                </span>
              </PropertyButton>
            </FlashWrap>
          )}
        </section>

        <section className="flex flex-col gap-4" aria-label="Bitácora">
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
        {sheetOpen && sheet === "status" && (
          <StatusOptions
            status={task.status}
            progressPct={progressDraft}
            completedAt={task.completedAt}
            onPick={pickStatus}
          />
        )}
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
                onClick={() => {
                  progressSave.flush();
                  pickStatus("completada");
                }}
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
