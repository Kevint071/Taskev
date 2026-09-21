import Link from "next/link";
import type { ComponentType, CSSProperties } from "react";
import { Brand } from "@/components/brand";
import { STATUS_LABELS, type Task } from "@/components/project-types";
import { ButtonLink } from "@/components/ui/button";
import {
  CalendarIcon,
  LockIcon,
  RefreshIcon,
  TriangleAlertIcon,
} from "@/components/ui/icons";
import { StatusDot } from "@/components/ui/status-badge";
import { TaskFlow } from "./task-flow";

const container = "mx-auto w-full max-w-[1120px] px-4 md:px-8";

const STEPS = [
  {
    title: "Crea un proyecto",
    text: "Un proyecto agrupa las tareas que comparten un objetivo: un cliente, la casa, un viaje.",
  },
  {
    title: "Añade tus tareas",
    text: "Ponles prioridad y fecha límite si las tienen. Ninguna de las dos es obligatoria.",
  },
  {
    title: "Abre Hoy",
    text: "Taskev suma la prioridad y la cercanía de la fecha: lo vencido y lo de hoy pesa más. Las tres primeras quedan marcadas.",
  },
];

const STATES: { status: Task["status"]; meaning: string }[] = [
  { status: "disponible", meaning: "Lista para empezar." },
  { status: "en_curso", meaning: "Ya tiene avance y muestra su porcentaje." },
  { status: "bloqueada", meaning: "Espera a otra persona o a otra cosa." },
  { status: "pausada", meaning: "La dejaste para más adelante." },
  {
    status: "completada",
    meaning: "Solo se puede cerrar cuando llega al 100 %.",
  },
];

type AgendaIcon = ComponentType<{ className?: string; style?: CSSProperties }>;

const AGENDA: {
  group: string;
  color: string;
  icon: AgendaIcon;
  task: string;
  detail: string;
}[] = [
  {
    group: "Bloqueadas",
    color: "var(--status-paused)",
    icon: LockIcon,
    task: "Firmar contrato con el proveedor",
    detail: "Casa",
  },
  {
    group: "Vencidas",
    color: "var(--danger)",
    icon: TriangleAlertIcon,
    task: "Renovar dominio",
    detail: "venció ayer",
  },
  {
    group: "Próximos 7 días",
    color: "var(--accent)",
    icon: CalendarIcon,
    task: "Revisar contrato de alquiler",
    detail: "en 5 días",
  },
  {
    group: "En curso",
    color: "var(--status-progress)",
    icon: RefreshIcon,
    task: "Enviar propuesta al cliente",
    detail: "60 %",
  },
];

const EXTRAS = [
  {
    title: "Comentarios",
    text: "Deja notas y decisiones dentro de cada tarea, con su fecha.",
  },
  {
    title: "Calendario",
    text: "Elige la fecha límite en un calendario en lugar de escribirla.",
  },
  {
    title: "Racha",
    text: "Cuenta cuántos días seguidos cerraste al menos una tarea.",
  },
  {
    title: "Claro y oscuro",
    text: "Elige un tema en Ajustes o deja que siga el de tu dispositivo.",
  },
];

export function Landing() {
  return (
    <div className="flex min-h-dvh min-w-0 flex-1 flex-col pt-16">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
        <div
          className={`${container} flex h-16 items-center justify-between gap-4`}
        >
          <Brand />
          <nav aria-label="Cuenta" className="flex items-center gap-1 sm:gap-2">
            <ButtonLink href="/login" variant="ghost">
              Entrar
            </ButtonLink>
            <ButtonLink href="/register" variant="primary">
              Crear cuenta
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section
          className={`${container} grid items-start gap-10 pt-6 pb-12 md:pt-12 md:pb-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] lg:gap-12 lg:items-center`}
        >
          <div className="flex w-full max-w-[34rem] flex-col items-start gap-5 md:gap-6">
            <h1 className="text-hero font-semibold text-balance">
              Abre la app y ya sabes qué tarea sigue.
            </h1>
            <p className="text-body text-muted md:text-[18px] md:leading-[1.6]">
              Taskev junta las tareas de todos tus proyectos en una sola lista y
              las ordena por la prioridad que les das y su fecha límite. Las
              tres primeras son tu día.
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto">
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink
                  href="/register"
                  variant="primary"
                  className="h-12 px-5 sm:h-11"
                >
                  Crear mi cuenta
                </ButtonLink>
                <ButtonLink href="/login" className="h-12 px-5 sm:h-11">
                  Ya tengo cuenta
                </ButtonLink>
              </div>
              <p className="text-center text-meta text-muted sm:text-left">
                Solo necesitas un correo y una contraseña.
              </p>
            </div>
          </div>

          <TaskFlow />
        </section>

        <section
          aria-labelledby="como-funciona"
          className="border-t border-line"
        >
          <div className={`${container} py-12 md:py-24`}>
            <h2
              id="como-funciona"
              className="max-w-[28rem] text-headline font-semibold text-balance"
            >
              Cómo funciona
            </h2>
            <ol className="mt-8 grid gap-7 md:mt-10 md:grid-cols-3 md:gap-10">
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                  className="border-t-2 border-ink pt-4 md:pt-5"
                >
                  <span className="tabular text-meta font-semibold text-accent">
                    Paso {i + 1}
                  </span>
                  <h3 className="mt-1 text-section font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-[24rem] text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="por-dentro"
          className="border-y border-line bg-raised"
        >
          <div className={`${container} py-12 md:py-24`}>
            <h2
              id="por-dentro"
              className="max-w-[32rem] text-headline font-semibold text-balance"
            >
              Distingue lo que puedes hacer de lo que está esperando
            </h2>

            <div className="mt-8 grid gap-10 md:mt-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <h3 className="text-section font-semibold">
                  Cada tarea dice en qué punto está
                </h3>
                <dl className="mt-4 divide-y divide-line border-y border-line">
                  {STATES.map(({ status, meaning }) => (
                    <div
                      key={status}
                      className="grid grid-cols-[8rem_1fr] items-baseline gap-4 py-3 sm:grid-cols-[9rem_1fr]"
                    >
                      <dt className="flex items-center gap-2 font-medium">
                        <StatusDot status={status} />
                        {STATUS_LABELS[status]}
                      </dt>
                      <dd className="text-muted">{meaning}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div>
                <h3 className="text-section font-semibold">
                  La Agenda reúne lo que pide seguimiento
                </h3>
                <div className="mt-4 overflow-hidden rounded-panel border border-line bg-surface">
                  <ul className="divide-y divide-line">
                    {AGENDA.map(
                      ({ group, color, icon: Icon, task, detail }) => (
                        <li
                          key={group}
                          className="flex items-center gap-3 px-3 py-3 sm:px-4"
                        >
                          <span
                            className="flex size-9 shrink-0 items-center justify-center rounded-control"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
                            }}
                          >
                            <Icon className="size-[18px]" style={{ color }} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{group}</p>
                            <p className="truncate text-meta text-muted">
                              {task}
                            </p>
                          </div>
                          <span className="tabular shrink-0 text-meta text-muted">
                            {detail}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <dl className="mt-12 grid gap-x-10 divide-y divide-line border-t border-line sm:grid-cols-2 sm:gap-y-8 sm:divide-y-0 sm:pt-10 md:mt-16 lg:grid-cols-4">
              {EXTRAS.map((extra) => (
                <div key={extra.title} className="py-4 sm:py-0">
                  <dt className="font-semibold">{extra.title}</dt>
                  <dd className="mt-1 text-muted">{extra.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section
          aria-labelledby="empezar"
          className="bg-accent text-accent-ink"
        >
          <div
            className={`${container} flex flex-col items-start gap-6 py-12 md:flex-row md:items-center md:justify-between md:py-20`}
          >
            <div className="max-w-[34rem]">
              <h2
                id="empezar"
                className="text-headline font-semibold text-balance"
              >
                Crea tu primer proyecto y deja que Taskev ordene el resto.
              </h2>
              <p className="mt-3 opacity-85">
                Añade unas tareas, abre Hoy y la siguiente ya estará marcada.
              </p>
            </div>
            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-x-5">
              <Link
                href="/register"
                className="inline-flex h-12 items-center sm:h-11 justify-center rounded-control bg-accent-ink px-5 font-medium whitespace-nowrap text-accent transition-opacity hover:opacity-90 focus-visible:outline-accent-ink"
              >
                Crear mi cuenta
              </Link>
              <Link
                href="/login"
                className="py-2 text-center font-medium underline underline-offset-4 focus-visible:outline-accent-ink"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
