"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { CalendarIcon, CheckIcon, FlameIcon } from "@/components/ui/icons";
import { StatusDot } from "@/components/ui/status-badge";

type PreviewTask = {
  id: string;
  title: string;
  project: string;
  due: string;
  progress: number;
  status: "en_curso" | "disponible";
};

/** In the order Taskev would rank them: the day's work comes off the top. */
const TASKS: PreviewTask[] = [
  {
    id: "propuesta",
    title: "Enviar propuesta al cliente",
    project: "Trabajo",
    due: "vence hoy",
    progress: 60,
    status: "en_curso",
  },
  {
    id: "contrato",
    title: "Revisar contrato de alquiler",
    project: "Casa",
    due: "vence mañana",
    progress: 20,
    status: "en_curso",
  },
  {
    id: "charla",
    title: "Preparar charla de octubre",
    project: "Comunidad",
    due: "vence en 3 días",
    progress: 35,
    status: "en_curso",
  },
  {
    id: "dentista",
    title: "Pedir cita con el dentista",
    project: "Personal",
    due: "vence en 5 días",
    progress: 0,
    status: "disponible",
  },
  {
    id: "dominio",
    title: "Renovar dominio",
    project: "Web personal",
    due: "vence en 6 días",
    progress: 0,
    status: "disponible",
  },
  {
    id: "objetivos",
    title: "Definir objetivos del mes",
    project: "Planificación",
    due: "vence en 8 días",
    progress: 0,
    status: "disponible",
  },
];

type Phase = "focus" | "progress" | "done" | "next";

const CAPTIONS: Record<Phase, string> = {
  focus: "Taskev deja arriba lo que más importa hoy.",
  progress: "Vas avanzando y el porcentaje se actualiza.",
  done: "La completas y suma a tu racha.",
  next: "La siguiente pasa al primer lugar.",
};

type Frame = {
  /** How many tasks have been completed so far; picks which ones are on screen. */
  k: number;
  phase: Phase;
  /** Hero progress while it is animating; `null` means the task's own value. */
  pct: number | null;
  leaving: boolean;
};

const START: Frame = { k: 0, phase: "focus", pct: null, leaving: false };

const STREAK = 4;
const COMPLETED_TODAY_BASE = 1;
const COMPLETED_WEEK_BASE = 5;

export function TodayPreview() {
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

  // One pass of the story for the current hero: it fills up, gets completed,
  // leaves, and the next task takes its place (which starts the next pass).
  useEffect(() => {
    if (!playing) return;
    const k = frame.k;
    const from = TASKS[k % TASKS.length].progress;
    const timers: number[] = [];
    let raf = 0;
    const at = (ms: number, run: () => void) => {
      timers.push(window.setTimeout(run, ms));
    };
    const patch = (next: Partial<Frame>) =>
      setFrame((current) => ({ ...current, ...next }));

    setFrame({
      k,
      phase: k === 0 ? "focus" : "next",
      pct: null,
      leaving: false,
    });

    at(1500, () => {
      patch({ phase: "progress" });
      const startedAt = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - startedAt) / 1100);
        patch({ pct: Math.round(from + (100 - from) * (1 - (1 - t) ** 3)) });
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    at(2800, () => patch({ phase: "done", pct: 100 }));
    at(4500, () => patch({ phase: "next", leaving: true }));
    at(4900, () =>
      setFrame({ k: k + 1, phase: "next", pct: null, leaving: false }),
    );

    return () => {
      for (const timer of timers) clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [playing, frame.k]);

  const at = (offset: number) => TASKS[(frame.k + offset) % TASKS.length];
  const hero = at(0);
  const pct = frame.pct ?? hero.progress;
  const done = frame.phase === "done" || frame.leaving;
  const bonus = done ? 1 : 0;
  const cycle = frame.k % TASKS.length;

  return (
    <figure
      ref={rootRef}
      data-motion-ok=""
      aria-label="Ejemplo animado de la pantalla Hoy: al completar una tarea, la siguiente pasa al primer lugar."
      className="min-w-0 w-full"
    >
      <div
        aria-hidden="true"
        className="relative rounded-[28px] border border-line bg-sunken px-2 py-10 [background-image:radial-gradient(var(--line-strong)_1px,transparent_1px)] [background-size:22px_22px] sm:px-10 sm:py-12"
      >
        <div className="relative mx-auto w-full max-w-[420px] rounded-[20px] border border-line bg-surface p-3.5 shadow-[0_30px_70px_-34px_rgba(26,35,50,0.4)] dark:shadow-none sm:p-5">
          <h2 className="text-page font-semibold">Hoy</h2>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-meta font-medium text-muted">Tu progreso</p>
              <span className="tabular inline-flex items-center gap-1.5 rounded-full bg-sunken py-1.5 pl-2 pr-3 text-[13px] font-bold">
                <FlameIcon className="size-[18px]" />
                {STREAK}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MetricCell
                label="completadas hoy"
                value={COMPLETED_TODAY_BASE + cycle + bonus}
                tint="rgba(111, 197, 154, 0.16)"
                icon={<CheckIcon className="size-[17px] text-status-done" />}
              />
              <MetricCell
                label="esta semana"
                value={COMPLETED_WEEK_BASE + cycle + bonus}
                tint="rgba(143, 164, 245, 0.16)"
                icon={<CalendarIcon className="size-[17px] text-accent" />}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <p className="text-meta font-medium text-accent">
              Prioridades de hoy
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <HeroTile
                key={hero.id}
                task={hero}
                pct={pct}
                done={done}
                leaving={frame.leaving}
              />
              <SecondaryTile
                key={`${at(1).id}-2`}
                task={at(1)}
                rank={2}
                delay={80}
              />
              <SecondaryTile
                key={`${at(2).id}-3`}
                task={at(2)}
                rank={3}
                delay={160}
              />
            </div>
          </div>

          {frame.phase === "done" && (
            <div
              key={frame.k}
              className="animate-toast-pop absolute -bottom-8 left-4 flex max-w-[calc(100%-2rem)] items-center gap-2.5 rounded-panel border border-line bg-raised py-2 pl-2 pr-4 shadow-lg dark:border-line-strong"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-status-done text-accent-ink">
                <CheckIcon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-ui font-semibold">
                  Tarea completada
                </span>
                <span className="block truncate text-meta text-muted">
                  {hero.title}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 px-1">
        <figcaption
          key={frame.phase}
          aria-hidden="true"
          className="animate-caption-in min-h-5 text-meta text-muted"
        >
          {CAPTIONS[frame.phase]}
        </figcaption>
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

function HeroTile({
  task,
  pct,
  done,
  leaving,
}: {
  task: PreviewTask;
  pct: number;
  done: boolean;
  leaving: boolean;
}) {
  const tone = done ? "var(--status-done)" : "var(--status-progress)";

  return (
    <div
      className={`relative col-span-full overflow-hidden rounded-panel border border-line bg-accent-soft p-5 ${
        leaving ? "animate-tile-out" : "animate-tile-in"
      }`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full bg-accent opacity-20 blur-2xl"
      />
      <div className="relative flex flex-col gap-3">
        <span
          key={done ? "done" : "open"}
          className={`absolute right-0 top-0 flex size-11 items-center justify-center rounded-full ${
            done ? "animate-ring-pulse" : ""
          }`}
          style={{
            background: `conic-gradient(${tone} ${pct}%, var(--line-strong) 0)`,
          }}
        >
          <span className="tabular flex size-8 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-ink">
            {done ? <CheckIcon className="size-4 text-status-done" /> : pct}
          </span>
        </span>
        <p className="pr-14 text-[19px] font-bold leading-tight tracking-tight">
          {task.title}
        </p>
        <div className="flex min-w-0 items-center gap-2 text-[12px] leading-[18px] text-muted">
          <span className="truncate">{task.project}</span>
          <span aria-hidden="true" className="text-line-strong">
            ·
          </span>
          {done ? (
            <span className="shrink-0 font-medium text-status-done">
              completada
            </span>
          ) : (
            <span className="shrink-0">{task.due}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SecondaryTile({
  task,
  rank,
  delay,
}: {
  task: PreviewTask;
  rank: number;
  delay: number;
}) {
  return (
    <div
      className="animate-tile-in relative flex min-w-0 flex-col gap-3 rounded-panel border border-line bg-raised p-3.5"
      style={{ "--delay": `${delay}ms` } as CSSProperties}
    >
      <span className="absolute right-3.5 top-3.5 text-[10px] font-bold text-muted">
        #{rank}
      </span>
      <span className="line-clamp-3 min-w-0 pr-7 text-[12.5px] font-semibold leading-snug">
        {task.title}
      </span>
      <div className="mt-auto flex items-center gap-1.5">
        <StatusDot status={task.status} />
        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${task.progress}%` }}
          />
        </div>
        <span className="tabular shrink-0 text-[10.5px] font-semibold text-muted">
          {task.progress}%
        </span>
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tint: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-panel bg-sunken p-2.5 sm:gap-3 sm:p-3">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full sm:size-9"
        style={{ backgroundColor: tint }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p
          key={value}
          className="animate-bump tabular text-[19px] font-semibold leading-tight tracking-tight"
        >
          {value}
        </p>
        <p className="truncate text-[11px] leading-tight text-muted">{label}</p>
      </div>
    </div>
  );
}
