import type { CSSProperties, ReactNode } from "react";
import type { Task } from "@/components/group-types";
import {
  CalendarIcon,
  CheckIcon,
  FlagIcon,
  PlusIcon,
  SparklesIcon,
} from "@/components/ui/icons";
import { STATUS_DOT } from "@/components/ui/status-badge";

/*
 * Static, decorative pieces of interface for the landing. They mirror the
 * real screens (same tokens, same chips) so what visitors see is what they get.
 * Every wrapper is aria-hidden: the surrounding section says it in words.
 */

const CHIP =
  "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-meta font-medium whitespace-nowrap";

function Window({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden rounded-panel border border-line bg-raised shadow-panel ${className}`}
    >
      {children}
    </div>
  );
}

function PriorityPill({ value }: { value: number }) {
  return (
    <span className={`${CHIP} tabular bg-sunken text-ink`}>
      <FlagIcon className="size-3.5 text-muted" />
      {value}
    </span>
  );
}

function DuePill({ children, tone }: { children: ReactNode; tone?: "danger" }) {
  return (
    <span
      className={`${CHIP} ${tone === "danger" ? "text-danger" : "text-ink"}`}
      style={{
        backgroundColor:
          tone === "danger"
            ? "color-mix(in srgb, var(--danger) 14%, transparent)"
            : "var(--sunken)",
      }}
    >
      <CalendarIcon className="size-3.5" />
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Step vignettes                                                      */
/* ------------------------------------------------------------------ */

const GROUPS = [
  { name: "Trabajo", open: 4, pct: 55 },
  { name: "Casa", open: 3, pct: 25 },
  { name: "Viaje a Lisboa", open: 6, pct: 70 },
];

/** Step 1: a few groups, each with how much is left and how far along it is. */
export function GroupsMock() {
  return (
    <Window className="p-3">
      <ul className="flex flex-col gap-2">
        {GROUPS.map((group) => (
          <li
            key={group.name}
            className="rounded-control border border-line bg-surface px-3 py-2.5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{group.name}</span>
              <span className="tabular text-meta text-muted">
                {group.open} abiertas
              </span>
            </div>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-sunken">
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${group.pct}%` }}
              />
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2 rounded-control border border-dashed border-line-strong px-3 py-2.5 text-meta font-medium text-muted">
          <PlusIcon className="size-4" />
          Nuevo grupo
        </li>
      </ul>
    </Window>
  );
}

/** Step 2: a task with the two optional fields, priority and due date. */
export function TaskFormMock() {
  return (
    <Window className="p-4">
      <p className="text-meta text-muted">Título</p>
      <p className="mt-1 rounded-control border border-line-strong bg-surface px-3 py-2 font-medium">
        Enviar propuesta al cliente
      </p>

      <p className="mt-4 text-meta text-muted">Prioridad</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="relative h-2 flex-1 rounded-full bg-sunken">
          <span className="absolute inset-y-0 left-0 w-3/5 rounded-full bg-accent" />
          <span className="absolute top-1/2 left-3/5 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-accent bg-raised shadow-panel" />
        </span>
        <span className="tabular w-4 text-right font-semibold">3</span>
      </div>

      <p className="mt-4 text-meta text-muted">Fecha límite</p>
      <div className="mt-1 inline-flex items-center gap-2 rounded-control border border-line-strong bg-surface px-3 py-2 font-medium">
        <CalendarIcon className="size-4 text-muted" />
        Hoy
      </div>
    </Window>
  );
}

const PICKS = [
  { title: "Enviar propuesta al cliente", group: "Trabajo" },
  { title: "Revisar contrato de alquiler", group: "Casa" },
  { title: "Preparar charla de octubre", group: "Comunidad" },
  { title: "Pedir cita con el dentista", group: "Personal" },
];

/** Step 3: Hoy, with the first three marked and the rest waiting. */
export function TodayStepMock() {
  return (
    <Window className="p-3">
      <ul className="flex flex-col gap-2">
        {PICKS.map((pick, i) => {
          const top = i < 3;
          return (
            <li
              key={pick.title}
              className={`flex items-center gap-3 rounded-control border px-3 py-2.5 ${
                i === 0
                  ? "border-accent/60 bg-accent-soft"
                  : top
                    ? "border-accent/30 bg-raised"
                    : "border-line bg-surface opacity-70"
              }`}
            >
              <span
                className={`tabular flex size-6 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold ${
                  i === 0
                    ? "bg-accent text-accent-ink"
                    : top
                      ? "bg-accent-soft text-accent"
                      : "bg-sunken text-muted"
                }`}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{pick.title}</span>
                <span className="block truncate text-meta text-muted">
                  {pick.group}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Window>
  );
}

/* ------------------------------------------------------------------ */
/* Ranking: what the score is made of                                  */
/* ------------------------------------------------------------------ */

// Same weights as `computeRelevance` in src/lib/relevance.ts, so the bars add up.
const PRIORITY_WEIGHT = 20;
const URGENCY_MAX = 100;
const URGENCY_DECAY_DAYS = 14;

const RANKED = [
  {
    title: "Enviar propuesta al cliente",
    group: "Trabajo",
    priority: 3,
    days: 0,
    due: "hoy",
  },
  {
    title: "Revisar contrato de alquiler",
    group: "Casa",
    priority: 2,
    days: 1,
    due: "mañana",
  },
  {
    title: "Preparar charla de octubre",
    group: "Comunidad",
    priority: 2,
    days: 3,
    due: "en 3 días",
  },
  {
    title: "Pedir cita con el dentista",
    group: "Personal",
    priority: 1,
    days: 5,
    due: "en 5 días",
  },
  {
    title: "Renovar dominio",
    group: "Web personal",
    priority: 1,
    days: 6,
    due: "en 6 días",
  },
].map((task) => ({
  ...task,
  fromPriority: task.priority * PRIORITY_WEIGHT,
  fromDate: URGENCY_MAX * Math.exp(-task.days / URGENCY_DECAY_DAYS),
}));

const SCALE = Math.max(...RANKED.map((t) => t.fromPriority + t.fromDate));

/** Hoy's ranking: every task with a bar made of its priority and its due date. */
export function RankingBoard() {
  return (
    <Window>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3">
        <span className="font-semibold">Hoy</span>
        <span className="flex items-center gap-4 text-meta text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-accent" />
            Prioridad
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--accent) 38%, transparent)",
              }}
            />
            Fecha
          </span>
        </span>
      </div>
      <ol className="divide-y divide-line">
        {RANKED.map((task, i) => (
          <li
            key={task.title}
            className={`px-4 py-3 ${i < 3 ? "" : "opacity-70"}`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`tabular flex size-6 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold ${
                  i === 0
                    ? "bg-accent text-accent-ink"
                    : i < 3
                      ? "bg-accent-soft text-accent"
                      : "bg-sunken text-muted"
                }`}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{task.title}</span>
                <span className="block truncate text-meta text-muted">
                  {task.group}
                </span>
              </span>
              <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
                <PriorityPill value={task.priority} />
                <DuePill>{task.due}</DuePill>
              </span>
            </div>
            <span className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-sunken">
              <span
                className="h-full bg-accent"
                style={{ width: `${(task.fromPriority / SCALE) * 100}%` }}
              />
              <span
                className="h-full"
                style={
                  {
                    width: `${(task.fromDate / SCALE) * 100}%`,
                    backgroundColor:
                      "color-mix(in srgb, var(--accent) 38%, transparent)",
                  } as CSSProperties
                }
              />
            </span>
          </li>
        ))}
      </ol>
    </Window>
  );
}

/* ------------------------------------------------------------------ */
/* Status and due-date buckets                                         */
/* ------------------------------------------------------------------ */

export function StatusTile({
  status,
  label,
  meaning,
  tone,
}: {
  status: Task["status"];
  label: string;
  meaning: string;
  tone: string;
}) {
  return (
    <div
      className="rounded-panel border p-4"
      style={{
        borderColor: `color-mix(in srgb, ${tone} 35%, var(--line))`,
        backgroundColor: `color-mix(in srgb, ${tone} 9%, var(--raised))`,
      }}
    >
      <span className="inline-flex items-center gap-2 font-semibold">
        <span
          aria-hidden="true"
          className={`size-2.5 rounded-full ${STATUS_DOT[status]}`}
        />
        {label}
      </span>
      <p className="mt-2 text-muted">{meaning}</p>
    </div>
  );
}

const BUCKETS = [
  {
    name: "Vencidas",
    tone: "var(--danger)",
    tasks: [{ title: "Renovar dominio", when: "venció ayer" }],
  },
  {
    name: "Hoy",
    tone: "var(--accent)",
    tasks: [
      { title: "Enviar propuesta al cliente", when: "hoy" },
      { title: "Llamar a la gestoría", when: "hoy" },
    ],
  },
  {
    name: "Próximas",
    tone: "var(--muted)",
    tasks: [{ title: "Revisar contrato de alquiler", when: "en 5 días" }],
  },
  {
    name: "Completadas",
    tone: "var(--status-done)",
    tasks: [{ title: "Preparar factura de agosto", when: "ayer" }],
  },
];

/** The Tareas list: the same tasks cut into bands by how close the date is. */
export function BucketsMock() {
  return (
    <Window>
      {BUCKETS.map((bucket) => (
        <section
          key={bucket.name}
          className="border-b border-line last:border-b-0"
        >
          <h4
            className="flex items-center gap-2 px-4 py-2 text-meta font-semibold"
            style={{
              color: bucket.tone,
              backgroundColor: `color-mix(in srgb, ${bucket.tone} 9%, transparent)`,
            }}
          >
            {bucket.name}
            <span className="tabular font-medium opacity-80">
              {bucket.tasks.length}
            </span>
          </h4>
          <ul className="divide-y divide-line">
            {bucket.tasks.map((task) => (
              <li
                key={task.title}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                    bucket.name === "Completadas"
                      ? "border-status-done bg-status-done text-accent-ink"
                      : "border-line-strong"
                  }`}
                >
                  {bucket.name === "Completadas" && (
                    <CheckIcon className="size-3" />
                  )}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate ${
                    bucket.name === "Completadas"
                      ? "text-muted line-through"
                      : "font-medium"
                  }`}
                >
                  {task.title}
                </span>
                <span className="tabular shrink-0 text-meta text-muted">
                  {task.when}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Window>
  );
}

/* ------------------------------------------------------------------ */
/* Extras                                                              */
/* ------------------------------------------------------------------ */

/** A short exchange with the assistant, using the real chat bubble styles. */
export function AssistantMock() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2.5">
      <p className="chat-bubble-user ml-auto max-w-[85%] rounded-panel rounded-br-sm px-3.5 py-2.5">
        /crear llamar al dentista el viernes
      </p>
      <div className="chat-bubble-bot flex max-w-[92%] gap-2.5 rounded-panel rounded-bl-sm px-3.5 py-2.5">
        <SparklesIcon className="mt-0.5 size-4 shrink-0 text-accent" />
        <p>
          Creada en <strong className="font-semibold">Personal</strong>, con
          fecha el viernes y prioridad media.
        </p>
      </div>
    </div>
  );
}

/** A dated note inside a task. */
export function CommentMock() {
  return (
    <div
      aria-hidden="true"
      className="rounded-control border border-line bg-surface px-3.5 py-3"
    >
      <p>Esperando el presupuesto de la imprenta; lo retomo el lunes.</p>
      <p className="mt-1.5 text-meta text-muted">Hace 2 horas</p>
    </div>
  );
}

const WEEK = ["L", "M", "X", "J", "V", "S", "D"];

/** A week strip with the due date picked. */
export function CalendarMock() {
  const days = [6, 7, 8, 9, 10, 11, 12];
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-7 gap-1 rounded-control border border-line bg-surface p-2 text-center"
    >
      {WEEK.map((d) => (
        <span key={d} className="text-[0.75rem] text-muted">
          {d}
        </span>
      ))}
      {days.map((day) => (
        <span
          key={day}
          className={`tabular rounded-full py-1 text-ui ${
            day === 10 ? "bg-accent font-semibold text-accent-ink" : ""
          }`}
        >
          {day}
        </span>
      ))}
    </div>
  );
}

/** The two themes side by side, drawn with their own fixed palettes. */
export function ThemesMock() {
  const themes = [
    {
      name: "Claro",
      bg: "#f4f6f9",
      card: "#ffffff",
      line: "#e0e5ec",
      accent: "#3553c7",
      ink: "#1a2332",
    },
    {
      name: "Oscuro",
      bg: "#0a0c10",
      card: "#14171d",
      line: "#23272f",
      accent: "#8fa4f5",
      ink: "#d5dae4",
    },
  ];
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-2">
      {themes.map((t) => (
        <div
          key={t.name}
          className="rounded-control border p-2.5"
          style={{ backgroundColor: t.bg, borderColor: t.line }}
        >
          <div
            className="rounded-[5px] border px-2 py-1.5"
            style={{ backgroundColor: t.card, borderColor: t.line }}
          >
            <span
              className="block h-1.5 w-3/4 rounded-full"
              style={{ backgroundColor: t.ink, opacity: 0.75 }}
            />
            <span
              className="mt-1.5 block h-1.5 w-1/2 rounded-full"
              style={{ backgroundColor: t.accent }}
            />
          </div>
          <p
            className="mt-2 text-[0.75rem] font-medium"
            style={{ color: t.ink }}
          >
            {t.name}
          </p>
        </div>
      ))}
    </div>
  );
}
