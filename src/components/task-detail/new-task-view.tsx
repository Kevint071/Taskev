"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { STATUS_LABELS, type Task } from "@/components/group-types";
import { type StatusChange, StatusMenu } from "@/components/tasks/status-menu";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  BackIcon,
  CalendarIcon,
  CheckIcon,
  FlagIcon,
  PinIcon,
} from "@/components/ui/icons";
import { STATUS_TONE, StatusDot } from "@/components/ui/status-badge";
import { Toast, type ToastState, type ToastTone } from "@/components/ui/toast";
import { MAX_TASK_TITLE_LENGTH } from "@/lib/constraints";
import {
  formatDueDate,
  formatDueDateForTaskChip,
  formatPriority,
} from "@/lib/format";
import { groupTaskViewHref, groupTaskViewOf } from "@/lib/group-task-views";
import { PROGRESS_MAX } from "@/lib/progress";
import { ApiError, sendJson } from "@/lib/sync-queue";
import { autosize, PropertyChip } from "./task-detail-view";
import {
  CompletionPicker,
  DuePicker,
  PriorityStepper,
  ProgressSlider,
} from "./task-pickers";

type SheetKey = "due" | "priority" | "progress" | "completion";

const SHEET_TITLES: Record<SheetKey, string> = {
  due: "Fecha",
  priority: "Prioridad",
  progress: "Avance",
  completion: "¿Cuándo se completó?",
};

type Draft = {
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

/**
 * Full-page form for a task that does not exist yet: the same fields as the
 * task detail, kept locally until "Crear tarea" sends them in one request.
 */
export function NewTaskView({
  group,
}: {
  group: { id: string; name: string };
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [sheet, setSheet] = useState<SheetKey>("due");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const groupHref = `/groups/${group.id}`;
  const canSave = draft.title.trim() !== "" && !saving;

  // Read after mount: the server can't know the platform.
  const [modKey, setModKey] = useState("Ctrl");

  useEffect(() => {
    titleRef.current?.focus();
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setModKey("⌘");
  }, []);

  // Re-fit when the width changes (fonts loading, rotation, resizing).
  useEffect(() => {
    const observed = [titleRef.current, descriptionRef.current].filter(
      (el): el is HTMLTextAreaElement => el !== null,
    );
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        autosize(entry.target as HTMLTextAreaElement);
      }
    });
    for (const el of observed) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function showToast(message: string, tone: ToastTone = "warning") {
    setToast({ id: Date.now(), message, tone });
  }

  function update(changes: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...changes }));
  }

  function openSheet(next: SheetKey) {
    setSheet(next);
    setSheetOpen(true);
  }

  function changeStatus(change: StatusChange) {
    update(change);
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

  function saveCompletion(date: Date) {
    setSheetOpen(false);
    update({ status: "completada", completedAt: date.toISOString() });
  }

  function saveDueDate(date: Date | null) {
    setSheetOpen(false);
    update({ dueDate: date ? date.toISOString() : null });
  }

  async function handleCreate() {
    if (!canSave) return;
    setSaving(true);
    try {
      await sendJson<Task>(`/api/groups/${group.id}/tasks`, "POST", {
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
      router.replace(groupTaskViewHref(group.id, groupTaskViewOf(draft)));
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

  const done = draft.status === "completada";

  return (
    <div
      style={{ "--tone": STATUS_TONE[draft.status] } as CSSProperties}
      className="mx-auto flex w-full max-w-[640px] flex-1 flex-col 2xl:max-w-[800px]"
    >
      <div className="-mx-2 flex h-11 items-center justify-between">
        <Link
          href={groupHref}
          className="inline-flex h-11 min-w-0 items-center gap-0.5 rounded-[14px] pr-3 pl-1.5 text-ui font-medium text-muted transition-colors hover:text-ink"
        >
          <BackIcon />
          <span className="truncate">{group.name}</span>
        </Link>
        <button
          type="button"
          onClick={() => update({ pinnedToday: !draft.pinnedToday })}
          aria-pressed={draft.pinnedToday}
          aria-label={
            draft.pinnedToday
              ? "Quitar de las prioridades de hoy"
              : "Fijar para hoy"
          }
          title={
            draft.pinnedToday
              ? "Quitar de las prioridades de hoy"
              : "Fijar para hoy"
          }
          className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors ${
            draft.pinnedToday
              ? "text-accent hover:bg-accent-soft"
              : "text-muted hover:bg-sunken hover:text-ink"
          }`}
        >
          <PinIcon filled={draft.pinnedToday} className="size-[18px]" />
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCreate();
        }}
        onKeyDown={(e) => {
          // Cmd/Ctrl+Enter creates from any field, including the description.
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleCreate();
          }
        }}
        className="flex flex-1 flex-col"
      >
        <div className="flex flex-col gap-6 pt-4 pb-10">
          <header className="flex flex-col gap-4">
            <label className="block">
              <span className="sr-only">Título de la tarea</span>
              <textarea
                ref={titleRef}
                value={draft.title}
                placeholder="¿Qué hay que hacer?"
                onChange={(e) => {
                  update({ title: e.target.value });
                  autosize(e.target);
                }}
                onKeyDown={(e) => {
                  // Titles are one line: Enter moves on to the description.
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.metaKey &&
                    !e.ctrlKey
                  ) {
                    e.preventDefault();
                    descriptionRef.current?.focus();
                  }
                }}
                rows={1}
                maxLength={MAX_TASK_TITLE_LENGTH}
                className="-mx-1 block w-full resize-none overflow-hidden rounded-[4px] bg-transparent px-1 text-[23px] leading-[29px] font-semibold tracking-[-0.02em] text-pretty text-ink caret-accent outline-none placeholder:text-muted/70 sm:text-page"
              />
            </label>

            <section
              aria-label="Detalles"
              className="flex flex-wrap items-center gap-2"
            >
              <div className="max-w-full rounded-full border border-transparent">
                <StatusMenu
                  status={draft.status}
                  progressPct={draft.progressPct}
                  completedAt={draft.completedAt}
                  onChange={changeStatus}
                  onComplete={() => openSheet("completion")}
                  onBlocked={showToast}
                  trigger={({ open, toggle }) => (
                    <PropertyChip
                      label={`Estado: ${STATUS_LABELS[draft.status]}`}
                      icon={<StatusDot status={draft.status} />}
                      tone="var(--tone)"
                      appearance="select"
                      expanded={open}
                      onClick={toggle}
                    >
                      {STATUS_LABELS[draft.status]}
                    </PropertyChip>
                  )}
                />
              </div>

              <div className="max-w-full rounded-full border border-transparent">
                <PropertyChip
                  label={
                    draft.dueDate
                      ? `Fecha: ${formatDueDateForTaskChip(draft.dueDate)}`
                      : "Fecha: sin fecha"
                  }
                  icon={<CalendarIcon className="text-current" />}
                  appearance="quiet"
                  onClick={() => openSheet("due")}
                >
                  {draft.dueDate ? (
                    <span className="truncate">
                      {formatDueDateForTaskChip(draft.dueDate)}
                    </span>
                  ) : (
                    <span className="font-normal text-muted">Sin fecha</span>
                  )}
                </PropertyChip>
              </div>

              <div className="max-w-full rounded-full border border-transparent">
                <PropertyChip
                  label={`Avance: ${draft.progressPct} %`}
                  icon={
                    <span
                      aria-hidden="true"
                      style={{
                        background: `conic-gradient(var(--tone) ${draft.progressPct}%, var(--line-strong) 0)`,
                      }}
                      className="flex size-4 shrink-0 items-center justify-center rounded-full"
                    >
                      <span className="size-2 rounded-full bg-raised" />
                    </span>
                  }
                  appearance="quiet"
                  onClick={() => openSheet("progress")}
                >
                  <span className="tabular">{draft.progressPct} %</span>
                </PropertyChip>
              </div>

              <div className="max-w-full rounded-full border border-transparent">
                <PropertyChip
                  label={`Prioridad: ${formatPriority(draft.priority)}`}
                  icon={<FlagIcon className="text-current" />}
                  appearance="quiet"
                  onClick={() => openSheet("priority")}
                >
                  <span className="tabular">
                    {formatPriority(draft.priority)}
                  </span>
                </PropertyChip>
              </div>

              {done && draft.completedAt && (
                <div className="max-w-full rounded-full border border-transparent">
                  <PropertyChip
                    label={`Finalizada el ${formatDueDate(draft.completedAt)}`}
                    icon={<CheckIcon className="text-current" />}
                    appearance="quiet"
                    onClick={() => openSheet("completion")}
                  >
                    Finalizada el {formatDueDate(draft.completedAt)}
                  </PropertyChip>
                </div>
              )}
            </section>
          </header>

          <section aria-label="Descripción" className="mt-3">
            <h2 className="mb-2 text-ui font-semibold text-ink">Descripción</h2>
            <label className="block">
              <span className="sr-only">Descripción</span>
              <textarea
                ref={descriptionRef}
                value={draft.description}
                placeholder="Añade notas, contexto, enlaces…"
                onChange={(e) => {
                  update({ description: e.target.value });
                  autosize(e.target);
                }}
                rows={3}
                className="description-scrollbar block max-h-[440px] min-h-24 w-full resize-none overflow-y-auto rounded-xl border border-line bg-sunken/55 px-4 py-3 text-[15px] leading-7 text-ink caret-accent transition-[background-color,border-color,box-shadow] placeholder:text-muted/80 hover:border-line-strong focus:border-accent focus:bg-raised focus-visible:ring-2 focus-visible:ring-accent/15"
              />
            </label>
          </section>
        </div>

        <div className="sticky bottom-0 z-10 mt-auto flex justify-end pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-1 rounded-full border border-line bg-raised/80 p-1 shadow-lg shadow-black/5 backdrop-blur-md">
            <Link
              href={groupHref}
              className="inline-flex h-8 items-center rounded-full px-3.5 text-meta font-medium text-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={!canSave}
              aria-keyshortcuts="Control+Enter Meta+Enter"
              className="inline-flex h-8 items-center gap-2 rounded-full bg-accent pr-1.5 pl-3.5 text-meta font-semibold text-accent-ink transition-[background-color,opacity,transform] hover:bg-accent/90 active:scale-[0.97] disabled:pr-3.5 disabled:opacity-40"
            >
              {saving ? "Creando…" : "Crear tarea"}
              {canSave && (
                <kbd className="hidden h-5 items-center rounded-[5px] bg-accent-ink/20 px-1.5 font-sans text-[11px] font-semibold md:inline-flex">
                  {modKey} ↵
                </kbd>
              )}
            </button>
          </div>
        </div>
      </form>

      <BottomSheet
        open={sheetOpen}
        title={SHEET_TITLES[sheet]}
        onClose={() => setSheetOpen(false)}
      >
        {sheetOpen && sheet === "due" && (
          <DuePicker value={draft.dueDate} onPick={saveDueDate} />
        )}
        {sheetOpen && sheet === "priority" && (
          <div className="flex flex-col items-center gap-4 pt-2 pb-2">
            <PriorityStepper
              value={draft.priority}
              onChange={(priority) => update({ priority })}
              onSettle={() => {}}
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
              {draft.progressPct}
              <span className="text-muted">%</span>
            </p>
            <ProgressSlider
              value={draft.progressPct}
              onChange={changeProgress}
            />
            {draft.progressPct >= PROGRESS_MAX && !done && (
              <button
                type="button"
                onClick={() => setSheet("completion")}
                className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-status-done px-5 text-ui font-semibold text-accent-ink transition-opacity hover:opacity-90"
              >
                <CheckIcon />
                Marcar completada
              </button>
            )}
          </div>
        )}
        {sheetOpen && sheet === "completion" && (
          <CompletionPicker value={draft.completedAt} onPick={saveCompletion} />
        )}
      </BottomSheet>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
