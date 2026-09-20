"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  STATUS_LABELS,
  type Task,
  type TaskComment,
} from "@/components/project-types";
import { Button } from "@/components/ui/button";
import { CalendarPanel } from "@/components/ui/calendar-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateField } from "@/components/ui/date-field";
import { Field } from "@/components/ui/field";
import {
  CalendarIcon,
  CheckIcon,
  FlameIcon,
  ProgressGaugeIcon,
} from "@/components/ui/icons";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Popover } from "@/components/ui/popover";
import { ProgressInput } from "@/components/ui/progress-input";
import { StatusBadge, StatusDot } from "@/components/ui/status-badge";
import { todayUtcMidnight } from "@/lib/calendar";
import { MAX_TASK_TITLE_LENGTH } from "@/lib/constraints";
import { formatDateTime, formatLongDate } from "@/lib/format";
import { blockedFromDisponible, canCompleteAtProgress } from "@/lib/progress";
import { isTempId, type SyncQueue, sendJson, tempId } from "@/lib/sync-queue";

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

/** Wraps a field so it can briefly highlight right after a change is confirmed saved. */
function FlashWrap({ tick, children }: { tick: number; children: ReactNode }) {
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
      className="rounded-control border border-transparent"
    >
      {children}
    </div>
  );
}

function MetaCard({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-control border border-line bg-sunken/40 p-3">
      <span aria-hidden="true" className="mt-[3px] text-muted">
        {icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
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
  onUpdate,
  onLocalChange,
  onRemoteSave,
  onBlocked,
  onDelete,
}: {
  task: LocalTask;
  queue: SyncQueue;
  onUpdate: (updates: TaskUpdates) => void;
  onLocalChange: (updates: TaskUpdates) => void;
  onRemoteSave: (updates: TaskUpdates) => void;
  onBlocked: (message: string) => void;
  /** When provided, a delete action is shown in the header. */
  onDelete?: () => void;
}) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [description, setDescription] = useState(task.description ?? "");
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [bannerCompleteOpen, setBannerCompleteOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

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

  // Resync local drafts if the task changes from outside (e.g. a reload).
  useEffect(() => setTitleDraft(task.title), [task.title]);
  useEffect(() => setDescription(task.description ?? ""), [task.description]);
  useEffect(() => {
    autosize(titleRef.current);
    autosize(descriptionRef.current);
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

  function handleStatusChange(next: Task["status"]) {
    if (next === "completada") {
      if (!canCompleteAtProgress(task.progressPct)) {
        onBlocked("Sube el avance al 100% para poder completar la tarea.");
        return;
      }
      setBannerCompleteOpen(true);
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
    bumpFlash("status");
  }

  const commentGroups = groupCommentsByDay(comments);

  return (
    <div className="flex flex-col gap-6 px-4 py-4">
      <div className="flex flex-col gap-2 border-b border-line pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <FlashWrap tick={flash.title}>
            <label className="block min-w-0 flex-1">
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
                className="w-full resize-none overflow-hidden break-words rounded-[4px] bg-transparent px-1 -mx-1 text-section font-semibold text-ink caret-accent outline-none sm:text-page"
              />
            </label>
          </FlashWrap>
          {onDelete && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              Eliminar
            </Button>
          )}
        </div>
        <StatusBadge status={task.status} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetaCard icon={<StatusDot status={task.status} />}>
          <FlashWrap tick={flash.status}>
            <Field label="Estado">
              <Select
                value={task.status}
                onChange={(e) =>
                  handleStatusChange(e.target.value as Task["status"])
                }
                className="w-full"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </FlashWrap>
        </MetaCard>

        <MetaCard icon={<ProgressGaugeIcon />}>
          <FlashWrap tick={flash.progress}>
            <ProgressInput
              value={task.progressPct}
              onChange={(progressPct) => onLocalChange({ progressPct })}
              onSave={(progressPct) => {
                onRemoteSave({ progressPct });
                bumpFlash("progress");
              }}
            />
          </FlashWrap>
        </MetaCard>

        <MetaCard icon={<FlameIcon />}>
          <FlashWrap tick={flash.priority}>
            <Field label="Prioridad">
              <Input
                type="number"
                step="0.1"
                defaultValue={Number(task.priority)}
                onBlur={(e) => {
                  const priority = Number(e.target.value);
                  if (priority !== Number(task.priority)) {
                    onUpdate({ priority });
                    bumpFlash("priority");
                  }
                }}
                className="tabular w-full"
              />
            </Field>
          </FlashWrap>
        </MetaCard>

        <MetaCard icon={<CalendarIcon />}>
          <FlashWrap tick={flash.dueDate}>
            <Field label="Fecha límite">
              <DateField
                value={task.dueDate}
                onChange={(dueDate) => {
                  onUpdate({ dueDate });
                  bumpFlash("dueDate");
                }}
              />
            </Field>
          </FlashWrap>
        </MetaCard>

        {task.status === "completada" && (
          <MetaCard icon={<CheckIcon />}>
            <FlashWrap tick={flash.completedAt}>
              <Field label="Fecha de finalización">
                <DateField
                  value={task.completedAt}
                  onChange={(completedAt) => {
                    onUpdate({ completedAt });
                    bumpFlash("completedAt");
                  }}
                  allowClear={false}
                  placeholder="Elige la fecha"
                />
              </Field>
            </FlashWrap>
          </MetaCard>
        )}
      </div>

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
                  bumpFlash("status");
                }}
              />
            </div>
          )}
        </Popover>
      )}

      <FlashWrap tick={flash.description}>
        <Field label="Descripción">
          <Textarea
            ref={descriptionRef}
            value={description}
            placeholder="Notas, contexto, enlaces…"
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
            className="min-h-24 w-full resize-none overflow-hidden"
          />
        </Field>
      </FlashWrap>

      <div className="flex flex-col gap-4">
        <p className="text-meta font-medium text-muted">
          Bitácora
          {comments.length > 0 && (
            <span className="tabular"> ({comments.length})</span>
          )}
        </p>
        {commentGroups.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <p className="text-meta font-medium text-muted/80 capitalize">
              {group.label}
            </p>
            <ol className="flex flex-col gap-3 border-l border-line-strong pl-4">
              {group.items.map((c) => (
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
          </div>
        ))}
        <form
          onSubmit={handleAddComment}
          className="flex gap-2 border-t border-line pt-4"
        >
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
