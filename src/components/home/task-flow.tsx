"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { StatusDot } from "@/components/ui/status-badge";

type Chip = {
  id: string;
  title: string;
  project: string;
  due: string;
  progress: number;
  status: "en_curso" | "disponible";
  /** Where it floats before Taskev sorts it: x in % of its own width, y in px. */
  x: number;
  y: number;
  rot: number;
  scale: number;
};

/** In the order Taskev would rank them: the day's work comes off the top. */
const CHIPS: Chip[] = [
  {
    id: "propuesta",
    title: "Enviar propuesta al cliente",
    project: "Trabajo",
    due: "hoy",
    progress: 60,
    status: "en_curso",
    x: -18,
    y: 225,
    rot: -5,
    scale: 1,
  },
  {
    id: "contrato",
    title: "Revisar contrato de alquiler",
    project: "Casa",
    due: "mañana",
    progress: 20,
    status: "en_curso",
    x: 30,
    y: 55,
    rot: 5,
    scale: 1.04,
  },
  {
    id: "charla",
    title: "Preparar charla de octubre",
    project: "Comunidad",
    due: "3 días",
    progress: 35,
    status: "en_curso",
    x: 26,
    y: 292,
    rot: -7,
    scale: 0.96,
  },
  {
    id: "dentista",
    title: "Pedir cita con el dentista",
    project: "Personal",
    due: "5 días",
    progress: 0,
    status: "disponible",
    x: -34,
    y: 115,
    rot: 7,
    scale: 1,
  },
  {
    id: "dominio",
    title: "Renovar dominio",
    project: "Web personal",
    due: "6 días",
    progress: 0,
    status: "disponible",
    x: 34,
    y: 172,
    rot: -4,
    scale: 0.94,
  },
  {
    id: "objetivos",
    title: "Definir objetivos del mes",
    project: "Planificación",
    due: "8 días",
    progress: 0,
    status: "disponible",
    x: -30,
    y: 0,
    rot: -6,
    scale: 0.98,
  },
];

/** Small labels drifting around the tasks; they melt away once things are in order. */
const TAGS = [
  { label: "Vence hoy", x: -125, y: 66, rot: -8, dur: 4.6 },
  { label: "Prioridad alta", x: 120, y: 236, rot: 6, dur: 5.4 },
  { label: "En curso", x: -115, y: 305, rot: -4, dur: 4.1 },
];

type Phase = "chaos" | "order" | "work" | "done" | "leave";

const CAPTIONS: Record<Phase, string> = {
  chaos: "Todo llega a la vez.",
  order: "Lo que importa, arriba.",
  work: "Vas avanzando.",
  done: "Hecha.",
  leave: "Y ya sabes cuál sigue.",
};

type Frame = {
  /** How many tasks have been completed so far: rotates which one is first. */
  k: number;
  phase: Phase;
  /** Progress of the first task while it is animating; `null` means its own. */
  pct: number | null;
};

const START: Frame = { k: 0, phase: "order", pct: null };

const COUNT = CHIPS.length;
const PITCH = 60;
const CHIP_HEIGHT = 52;
const STAGE_HEIGHT = (COUNT - 1) * PITCH + CHIP_HEIGHT + 12;

const slotOf = (index: number, k: number) =>
  (((index - k) % COUNT) + COUNT) % COUNT;

/** Where a task sits in the current frame, and how it should look there. */
function describe(index: number, { k, phase }: Frame) {
  const base = slotOf(index, k);
  const gone = phase === "leave" && base === 0;
  // The first task has left, so everyone else moves up one place.
  const slot = phase === "leave" ? base - 1 : base;

  if (phase === "chaos") {
    const { x, y, rot, scale } = CHIPS[index];
    return {
      slot,
      kind: "chaos" as const,
      transform: `translate(calc(-50% + ${x}% * var(--spread)), ${y}px) rotate(${rot}deg) scale(${scale})`,
      opacity: 1,
      delay: index * 45,
      z: 10 + index,
    };
  }

  if (gone) {
    return {
      slot,
      kind: "done" as const,
      transform: "translate(calc(-50% + 80%), 0px) rotate(6deg) scale(0.94)",
      opacity: 0,
      delay: 0,
      z: 30,
    };
  }

  const kind =
    base === 0 && phase === "done"
      ? ("done" as const)
      : slot === 0
        ? ("lead" as const)
        : slot < 3
          ? ("next" as const)
          : ("rest" as const);

  return {
    slot,
    kind,
    transform: `translate(-50%, ${slot * PITCH}px)`,
    opacity: slot < 3 ? 1 : 0.7,
    delay: phase === "order" ? slot * 70 : 0,
    z: 20 - slot,
  };
}

export function TaskFlow() {
  const rootRef = useRef<HTMLElement>(null);
  const [frame, setFrame] = useState<Frame>(START);
  const [onScreen, setOnScreen] = useState(false);
  const [paused, setPaused] = useState(false);

  const playing = onScreen && !paused;

  // Runs on its own, but only while it is on screen.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) =>
      setOnScreen(entry.isIntersecting),
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // One pass of the story: the tasks scatter, get sorted, the first one is
  // worked on and completed, and it leaves (which starts the next pass).
  useEffect(() => {
    if (!playing) return;
    const k = frame.k;
    const from = CHIPS[k % COUNT].progress;
    const timers: number[] = [];
    let raf = 0;
    const at = (ms: number, run: () => void) => {
      timers.push(window.setTimeout(run, ms));
    };
    const patch = (next: Partial<Frame>) =>
      setFrame((current) => ({ ...current, ...next }));

    // The very first pass opens already sorted.
    const sorted = k === 0 ? 0 : 2100;
    patch({ phase: k === 0 ? "order" : "chaos", pct: null });
    if (k > 0) at(sorted, () => patch({ phase: "order" }));

    at(sorted + 1800, () => {
      patch({ phase: "work" });
      const startedAt = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - startedAt) / 1200);
        patch({ pct: Math.round(from + (100 - from) * (1 - (1 - t) ** 3)) });
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    at(sorted + 3300, () => patch({ phase: "done", pct: 100 }));
    at(sorted + 4800, () => patch({ phase: "leave" }));
    at(sorted + 5900, () => setFrame({ k: k + 1, phase: "chaos", pct: null }));

    return () => {
      for (const timer of timers) clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [playing, frame.k]);

  const ordered = frame.phase !== "chaos";
  const lead = CHIPS[frame.k % COUNT];
  const pct = frame.pct ?? lead.progress;

  return (
    <figure
      ref={rootRef}
      data-motion-ok=""
      aria-label="Animación: las tareas llegan desordenadas, Taskev las ordena por lo que importa y, al completar la primera, queda lista la siguiente."
      className="min-w-0 w-full"
    >
      <div
        aria-hidden="true"
        className="relative mx-auto w-full max-w-[560px] [--spread:0.3] [--tag-spread:1] sm:[--spread:1.15] sm:[--tag-spread:1.7]"
        style={{ height: STAGE_HEIGHT }}
      >
        <div
          className="pointer-events-none absolute -inset-x-[12%] -inset-y-[8%] rounded-[50%] bg-accent blur-3xl transition-opacity duration-1000"
          style={{ opacity: ordered ? 0.2 : 0.08 }}
        />

        {TAGS.map((tag, i) => (
          <div
            key={tag.label}
            className="absolute top-0 left-1/2 z-40 hidden w-max transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(0.2,0.9,0.25,1.1)] sm:block"
            style={{
              transform: ordered
                ? "translate(-50%, 170px) scale(0.5)"
                : `translate(calc(-50% + ${tag.x}% * var(--tag-spread)), ${tag.y}px) rotate(${tag.rot}deg)`,
              opacity: ordered ? 0 : 1,
              transitionDelay: `${i * 60}ms`,
            }}
          >
            <span
              className={`block rounded-full border border-line-strong bg-raised px-3 py-1.5 text-meta font-medium text-muted shadow-panel ${
                ordered ? "" : "animate-drift"
              }`}
              style={{ "--dur": `${tag.dur}s` } as CSSProperties}
            >
              {tag.label}
            </span>
          </div>
        ))}

        {CHIPS.map((chip, i) => {
          const view = describe(i, frame);
          const isLead = view.kind === "lead" || view.kind === "done";
          const done = view.kind === "done";

          return (
            <div
              key={chip.id}
              className="absolute top-0 left-1/2 w-[92%] max-w-[340px] transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(0.2,0.9,0.25,1.1)] will-change-transform sm:w-[68%]"
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
                    "--dur": `${4 + (i % 3) * 0.7}s`,
                    "--delay": `${-i * 0.6}s`,
                  } as CSSProperties
                }
              >
                <Badge kind={view.kind} slot={view.slot} status={chip.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ui font-semibold">{chip.title}</p>
                  <p className="truncate text-[12px] leading-4 text-muted">
                    {chip.project}
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
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p
          key={frame.phase}
          aria-hidden="true"
          className="animate-caption-in min-h-7 text-section font-semibold tracking-tight"
        >
          {CAPTIONS[frame.phase]}
        </p>
        <button
          type="button"
          onClick={() => setPaused((current) => !current)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-control px-2 py-1 text-meta font-medium text-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <svg
            viewBox="0 0 20 20"
            className="size-4"
            fill="currentColor"
            aria-hidden="true"
          >
            {!paused ? (
              <path d="M6 4h2.6v12H6zM11.4 4H14v12h-2.6z" />
            ) : (
              <path d="M6.5 4.2v11.6a.6.6 0 0 0 .9.5l9-5.8a.6.6 0 0 0 0-1l-9-5.8a.6.6 0 0 0-.9.5Z" />
            )}
          </svg>
          {paused ? "Reproducir animación" : "Pausar animación"}
        </button>
      </div>
    </figure>
  );
}

function Badge({
  kind,
  slot,
  status,
}: {
  kind: "chaos" | "lead" | "next" | "rest" | "done";
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
      className={`tabular flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors duration-500 ${tone}`}
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
      <span className="tabular flex size-7 items-center justify-center rounded-full bg-raised text-[11px] font-bold">
        {pct}
      </span>
    </span>
  );
}
