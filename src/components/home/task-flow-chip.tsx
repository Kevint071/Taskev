import type { CSSProperties } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { StatusDot } from "@/components/ui/status-badge";
import { CHIP_HEIGHT, type Chip, type ChipKind } from "./task-flow-data";

function Badge({
  kind,
  slot,
  status,
}: {
  kind: ChipKind;
  slot: number;
  status: Chip["status"];
}) {
  const tone =
    kind === "lead"
      ? "bg-accent text-accent-ink"
      : kind === "next"
        ? "bg-accent-soft text-accent"
        : kind === "done"
          ? "bg-status-done text-accent-ink animate-ring-pulse"
          : "bg-sunken";

  return (
    <span
      className={`tabular flex size-7 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold transition-colors duration-500 ${tone}`}
    >
      {kind === "lead" || kind === "next" ? (
        slot + 1
      ) : kind === "done" ? (
        <CheckIcon className="size-4" />
      ) : (
        <StatusDot status={status} />
      )}
    </span>
  );
}

function Ring({ pct, done }: { pct: number; done: boolean }) {
  const tone = done ? "var(--status-done)" : "var(--accent)";

  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${tone} ${pct}%, var(--line-strong) 0)`,
      }}
    >
      <span className="tabular flex size-7 items-center justify-center rounded-full bg-raised text-[0.75rem] font-bold">
        {pct}
      </span>
    </span>
  );
}

/** One animated task card; `view` says where it sits and how it looks. */
export function FlowChip({
  chip,
  index,
  view,
  pct,
}: {
  chip: Chip;
  index: number;
  view: {
    slot: number;
    kind: ChipKind;
    transform: string;
    opacity: number;
    delay: number;
    z: number;
  };
  /** Progress shown on the ring of the first task. */
  pct: number;
}) {
  const isLead = view.kind === "lead" || view.kind === "done";
  const done = view.kind === "done";

  return (
    <div
      className="absolute top-0 left-1/2 w-[92%] max-w-85 transition-[transform,opacity] duration-900 ease-[cubic-bezier(0.2,0.9,0.25,1.1)] will-change-transform sm:w-[68%]"
      style={{
        transform: view.transform,
        opacity: view.opacity,
        transitionDelay: `${view.delay}ms`,
        zIndex: view.z,
      }}
    >
      <div
        className={`flex items-center gap-3 rounded-panel border px-3 transition-[background-color,border-color,box-shadow] duration-500 ${
          view.kind === "chaos" ? "animate-drift" : ""
        } ${
          view.kind === "lead"
            ? "border-accent/60 bg-accent-soft shadow-[0_16px_38px_-16px_var(--accent)]"
            : view.kind === "next"
              ? "border-accent/30 bg-raised"
              : view.kind === "done"
                ? "border-status-done bg-[color-mix(in_srgb,var(--status-done)_14%,var(--raised))]"
                : "border-line bg-raised"
        }`}
        style={
          {
            height: CHIP_HEIGHT,
            "--dur": `${4 + (index % 3) * 0.7}s`,
            "--delay": `${-index * 0.6}s`,
          } as CSSProperties
        }
      >
        <Badge kind={view.kind} slot={view.slot} status={chip.status} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-ui font-semibold">{chip.title}</p>
          <p className="truncate text-[0.75rem] leading-4 text-muted">
            {chip.group}
          </p>
        </div>
        {isLead ? (
          <Ring pct={done ? 100 : pct} done={done} />
        ) : (
          <span className="tabular shrink-0 text-meta text-muted">
            {chip.due}
          </span>
        )}
      </div>
    </div>
  );
}
