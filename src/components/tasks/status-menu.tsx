"use client";

import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { STATUS_LABELS, type Task } from "@/components/project-types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CheckIcon, LockIcon, RefreshIcon } from "@/components/ui/icons";
import { Popover } from "@/components/ui/popover";
import { STATUS_DOT } from "@/components/ui/status-badge";
import { formatDueDate } from "@/lib/format";
import { type MenuPlacement, menuPlacement } from "@/lib/menu-placement";
import { canCompleteAtProgress, statusTransition } from "@/lib/progress";

const STATUS_ORDER = Object.keys(STATUS_LABELS) as Task["status"][];

// Matches the menu's `mt-1.5` / `mb-1.5` offset from its trigger.
const MENU_GAP_PX = 6;

export type StatusChange = {
  status: Task["status"];
  completedAt: string | null;
  /** Only set when the change also resets progress (back to "disponible"). */
  progressPct?: number;
};

export type StatusMenuTrigger = {
  open: boolean;
  toggle: () => void;
};

/**
 * The status dropdown shared by project task rows and the task detail. It owns
 * the transition rules: "completada" stays dimmed below 100% and only warns,
 * and going back to "disponible" with leftover progress asks to reset it first.
 */
export function StatusMenu({
  status,
  progressPct,
  completedAt,
  onChange,
  onComplete,
  onBlocked,
  onOpenChange,
  trigger,
}: {
  status: Task["status"];
  progressPct: number;
  completedAt: string | null;
  onChange: (change: StatusChange) => void;
  /** Picking "completada" at 100%: the caller asks for the completion date. */
  onComplete: () => void;
  onBlocked: (message: string) => void;
  /** Lets the caller lift its stacking layer while the menu is open. */
  onOpenChange?: (open: boolean) => void;
  trigger: (props: StatusMenuTrigger) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [placement, setPlacement] = useState<MenuPlacement>("bottom");
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLFieldSetElement>(null);

  // Measured before paint so a menu near the phone tab bar opens upward
  // instead of covering it.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!open || !anchor || !menu) return;
    const rect = anchor.getBoundingClientRect();
    const bar = document
      .querySelector("[data-bottom-bar]")
      ?.getBoundingClientRect();
    const bottomLimit = bar && bar.height > 0 ? bar.top : window.innerHeight;
    setPlacement(
      menuPlacement({
        spaceAbove: rect.top - MENU_GAP_PX,
        spaceBelow: bottomLimit - rect.bottom - MENU_GAP_PX,
        menuHeight: menu.offsetHeight,
      }),
    );
  }, [open]);

  function setMenuOpen(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  function pick(next: Task["status"]) {
    setMenuOpen(false);
    const transition = statusTransition(next, {
      status,
      progressPct,
      completedAt,
    });
    switch (transition.kind) {
      case "none":
        return;
      case "blocked":
        onBlocked(transition.message);
        return;
      case "needCompletionDate":
        onComplete();
        return;
      case "confirmReset":
        setConfirmReset(true);
        return;
      case "apply":
        onChange({ status: next, completedAt: null });
    }
  }

  const completeLocked = !canCompleteAtProgress(progressPct);

  return (
    <>
      <Popover
        open={open}
        onClose={() => setMenuOpen(false)}
        className={open ? "z-50" : ""}
      >
        {open && (
          // Swallows the outside click so it can't reach a row link underneath.
          <button
            type="button"
            aria-label="Cerrar menú de estados"
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-0 cursor-default bg-transparent"
          />
        )}
        <div ref={anchorRef} className="relative z-10">
          {trigger({ open, toggle: () => setMenuOpen(!open) })}
          {open && (
            <fieldset
              ref={menuRef}
              className={`animate-menu-in pointer-events-auto absolute left-0 z-50 m-0 flex min-w-44 flex-col gap-0.5 rounded-control border border-line-strong bg-raised p-1 shadow-lg ${
                placement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
              }`}
              style={{
                backgroundColor: "var(--raised)",
                transformOrigin:
                  placement === "top" ? "bottom left" : undefined,
              }}
            >
              <legend className="sr-only">Cambiar estado</legend>
              {STATUS_ORDER.map((s) => {
                const current = status === s;
                const locked = s === "completada" && completeLocked && !current;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={current}
                    aria-disabled={locked || undefined}
                    title={
                      locked
                        ? `Falta ${100 - progressPct} % de avance`
                        : undefined
                    }
                    onClick={() => pick(s)}
                    className={`flex min-h-9 w-full items-center gap-2 rounded-control px-2.5 text-left text-meta transition-colors ${
                      current
                        ? "bg-sunken font-semibold text-ink"
                        : locked
                          ? "cursor-not-allowed text-muted/70"
                          : "text-ink hover:bg-sunken"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[s]} ${locked ? "opacity-40" : ""}`}
                    />
                    <span className="min-w-0 flex-1">{STATUS_LABELS[s]}</span>
                    {current && <CheckIcon className="size-4 text-accent" />}
                    {locked && <LockIcon className="size-3.5 text-muted" />}
                  </button>
                );
              })}
            </fieldset>
          )}
        </div>
      </Popover>

      {confirmReset && (
        <ConfirmDialog
          open
          tone="warning"
          icon={<RefreshIcon className="size-5" />}
          title="¿Volver a disponible?"
          description={
            <ResetSummary progressPct={progressPct} completedAt={completedAt} />
          }
          confirmLabel="Pasar a disponible"
          onConfirm={() => {
            setConfirmReset(false);
            onChange({
              status: "disponible",
              completedAt: null,
              progressPct: 0,
            });
          }}
          onClose={() => setConfirmReset(false)}
        />
      )}
    </>
  );
}

function ResetSummary({
  progressPct,
  completedAt,
}: {
  progressPct: number;
  completedAt: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p>
        {progressPct > 0
          ? "La tarea vuelve a empezar: su avance se reducirá a 0 %."
          : "La tarea vuelve a empezar desde cero."}
      </p>
      {progressPct > 0 && (
        <div className="rounded-2xl border border-line bg-sunken/60 px-3.5 py-3">
          <div className="flex items-baseline justify-between text-meta">
            <span>Avance</span>
            <span className="tabular font-semibold text-ink">
              {progressPct} % <span className="text-muted">→</span> 0 %
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
            <div
              style={{ "--from": `${progressPct}%` } as CSSProperties}
              className="animate-progress-drain h-full rounded-full bg-linear-to-r from-status-paused to-status-progress"
            />
          </div>
        </div>
      )}
      {completedAt && (
        <p className="text-meta">
          También se borrará la fecha de finalización (
          {formatDueDate(completedAt)}).
        </p>
      )}
    </div>
  );
}
