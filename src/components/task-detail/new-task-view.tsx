"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { STATUS_TONE } from "@/components/ui/status-badge";
import { Toast } from "@/components/ui/toast";
import { MAX_TASK_TITLE_LENGTH } from "@/lib/constraints";
import { PROGRESS_MAX } from "@/lib/progress";
import { TaskNavBar } from "./task-nav-bar";
import { TaskPropertyChips } from "./task-property-chips";
import { TaskPropertySheet, usePropertySheet } from "./task-property-sheet";
import { autosize, useAutosize } from "./use-autosize";
import { useNewTask } from "./use-new-task";

/**
 * Full-page form for a task that does not exist yet: the same fields as the
 * task detail, kept locally until "Crear tarea" sends them in one request.
 */
export function NewTaskView({
  group,
}: {
  group: { id: string; name: string };
}) {
  const form = useNewTask(group.id);
  const { draft } = form;
  const sheet = usePropertySheet();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const groupHref = `/groups/${group.id}`;
  const done = draft.status === "completada";

  // Read after mount: the server can't know the platform.
  const [modKey, setModKey] = useState("Ctrl");

  useEffect(() => {
    titleRef.current?.focus();
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setModKey("⌘");
  }, []);

  useAutosize(titleRef);
  useAutosize(descriptionRef);

  function saveCompletion(date: Date) {
    sheet.hide();
    form.update({ status: "completada", completedAt: date.toISOString() });
  }

  function saveDueDate(date: Date | null) {
    sheet.hide();
    form.update({ dueDate: date ? date.toISOString() : null });
  }

  return (
    <div
      style={{ "--tone": STATUS_TONE[draft.status] } as CSSProperties}
      className="mx-auto flex w-full max-w-160 flex-1 flex-col 2xl:max-w-200"
    >
      <TaskNavBar
        back={{ href: groupHref, label: group.name }}
        pinned={draft.pinnedToday}
        onTogglePin={() => form.update({ pinnedToday: !draft.pinnedToday })}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.create();
        }}
        onKeyDown={(e) => {
          // Cmd/Ctrl+Enter creates from any field, including the description.
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            form.create();
          }
        }}
        className="flex flex-1 flex-col"
      >
        <div className="flex flex-col gap-6 pt-4 pb-10">
          <header className="flex flex-col gap-4">
            <h1 className="sr-only">Nueva tarea</h1>
            <label className="block">
              <span className="sr-only">Título de la tarea</span>
              <textarea
                ref={titleRef}
                value={draft.title}
                placeholder="¿Qué hay que hacer?"
                onChange={(e) => {
                  form.update({ title: e.target.value });
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
                className="-mx-1 block w-full resize-none overflow-hidden rounded-sm bg-transparent px-1 text-[23px] leading-7.25 font-semibold tracking-[-0.02em] text-pretty text-ink caret-accent outline-none placeholder:text-muted focus-visible:shadow-none sm:text-page"
              />
            </label>

            <TaskPropertyChips
              status={draft.status}
              progressPct={draft.progressPct}
              priority={draft.priority}
              dueDate={draft.dueDate}
              completedAt={draft.completedAt}
              onStatusChange={form.update}
              onRequestCompletion={() => sheet.show("completion")}
              onBlocked={form.showToast}
              onOpenSheet={sheet.show}
            />
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
                  form.update({ description: e.target.value });
                  autosize(e.target);
                }}
                rows={3}
                className="block max-h-110 min-h-24 w-full resize-none overflow-y-auto rounded-xl border border-control bg-sunken/55 px-4 py-3 text-[15px] leading-7 text-ink caret-accent transition-[background-color,border-color,box-shadow] placeholder:text-muted hover:border-ink/40 focus:border-accent focus:bg-raised focus-visible:ring-2 focus-visible:ring-accent/15"
              />
            </label>
          </section>
        </div>

        <div className="sticky bottom-0 z-10 mt-auto flex items-center justify-end gap-1 pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Link
            href={groupHref}
            className="inline-flex h-8 items-center rounded-full px-3.5 text-meta font-medium text-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={!form.canSave}
            aria-keyshortcuts="Control+Enter Meta+Enter"
            className="inline-flex h-8 items-center gap-2 rounded-full bg-accent px-3.5 text-meta font-semibold text-accent-ink transition-[background-color,opacity,transform] hover:bg-accent/90 active:scale-[0.97] disabled:opacity-40"
          >
            {form.saving ? "Creando…" : "Crear tarea"}
            {form.canSave && (
              <kbd className="hidden h-5 items-center rounded-[5px] bg-accent-ink/20 px-1.5 font-sans text-[0.75rem] font-semibold md:inline-flex">
                {modKey} ↵
              </kbd>
            )}
          </button>
        </div>
      </form>

      <TaskPropertySheet
        sheet={sheet.sheet}
        open={sheet.open}
        dueDate={draft.dueDate}
        priority={draft.priority}
        progressPct={draft.progressPct}
        completedAt={draft.completedAt}
        canMarkComplete={draft.progressPct >= PROGRESS_MAX && !done}
        onClose={sheet.hide}
        onPickDue={saveDueDate}
        onPriorityChange={(priority) => form.update({ priority })}
        onPrioritySettle={() => {}}
        onProgressChange={form.changeProgress}
        onPickCompletion={saveCompletion}
        onMarkComplete={() => sheet.show("completion")}
      />

      <Toast toast={form.toast} onDismiss={form.dismissToast} />
    </div>
  );
}
