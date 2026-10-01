import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { CheckIcon } from "@/components/ui/icons";
import {
  CompletionPicker,
  DuePicker,
  PriorityStepper,
  ProgressSlider,
} from "./task-pickers";

/** Each property opens its own contextual sheet instead of sitting on the page as an input. */
export type SheetKey = "due" | "priority" | "progress" | "completion";

const SHEET_TITLES: Record<SheetKey, string> = {
  due: "Fecha",
  priority: "Prioridad",
  progress: "Avance",
  completion: "¿Cuándo se completó?",
};

/** Which sheet is shown. `sheet` outlives `open` so the title doesn't blank while it closes. */
export function usePropertySheet() {
  const [sheet, setSheet] = useState<SheetKey>("due");
  const [open, setOpen] = useState(false);

  return {
    sheet,
    open,
    show: (next: SheetKey) => {
      setSheet(next);
      setOpen(true);
    },
    hide: () => setOpen(false),
  };
}

/** Bottom sheet with the picker for one task property at a time. */
export function TaskPropertySheet({
  sheet,
  open,
  dueDate,
  priority,
  progressPct,
  completedAt,
  canMarkComplete,
  onClose,
  onPickDue,
  onPriorityChange,
  onPrioritySettle,
  onProgressChange,
  onPickCompletion,
  onMarkComplete,
}: {
  sheet: SheetKey;
  open: boolean;
  dueDate: string | null;
  priority: number;
  progressPct: number;
  completedAt: string | null;
  /** Progress is full but the task is not marked done yet. */
  canMarkComplete: boolean;
  onClose: () => void;
  onPickDue: (date: Date | null) => void;
  onPriorityChange: (priority: number) => void;
  onPrioritySettle: () => void;
  onProgressChange: (progressPct: number) => void;
  onPickCompletion: (date: Date) => void;
  onMarkComplete: () => void;
}) {
  return (
    <BottomSheet open={open} title={SHEET_TITLES[sheet]} onClose={onClose}>
      {open && sheet === "due" && (
        <DuePicker value={dueDate} onPick={onPickDue} />
      )}
      {open && sheet === "priority" && (
        <div className="flex flex-col items-center gap-4 pt-2 pb-2">
          <PriorityStepper
            value={priority}
            onChange={onPriorityChange}
            onSettle={onPrioritySettle}
          />
          <p className="max-w-[30ch] text-center text-meta text-balance text-muted">
            Cuanto mayor, antes aparece en Hoy. Pesa junto con la fecha y el
            avance.
          </p>
        </div>
      )}
      {open && sheet === "progress" && (
        <div className="flex flex-col gap-2 pb-2">
          <p
            aria-live="polite"
            className="tabular text-center text-[40px] leading-11 font-semibold tracking-[-0.03em]"
          >
            {progressPct}
            <span className="text-muted">%</span>
          </p>
          <ProgressSlider value={progressPct} onChange={onProgressChange} />
          {canMarkComplete && (
            <button
              type="button"
              onClick={onMarkComplete}
              className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-status-done px-5 text-ui font-semibold text-accent-ink transition-opacity hover:opacity-90"
            >
              <CheckIcon />
              Marcar completada
            </button>
          )}
        </div>
      )}
      {open && sheet === "completion" && (
        <CompletionPicker value={completedAt} onPick={onPickCompletion} />
      )}
    </BottomSheet>
  );
}
