import type { ComponentType } from "react";
import { Brand } from "@/components/brand";
import { STATUS_LABELS, type Task } from "@/components/group-types";
import { ButtonLink } from "@/components/ui/button";
import {
  CalendarIcon,
  CheckIcon,
  TriangleAlertIcon,
} from "@/components/ui/icons";
import { StatusDot } from "@/components/ui/status-badge";
import { CtaLink, SecondaryLink } from "./cta-link";
import { TaskFlow } from "./task-flow";

const container = "mx-auto w-full max-w-[1120px] px-4 md:px-8";

const STEPS = [
  {
    title: "Crea un grupo",
    text: "Un grupo reúne las tareas que comparten un objetivo: un cliente, la casa, un viaje.",
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

type BucketIcon = ComponentType<{ className?: string }>;

const TASK_BUCKETS: {
  bucket: string;
  color: string;
  icon: BucketIcon;
  task: string;
  detail: string;
}[] = [
  {
    bucket: "Vencidas",
    color: "var(--danger)",
    icon: TriangleAlertIcon,
    task: "Renovar dominio",
    detail: "venció ayer",
  },
  {
    bucket: "Hoy",
    color: "var(--accent)",
    icon: CalendarIcon,
    task: "Enviar propuesta al cliente",
    detail: "hoy",
  },
  {
    bucket: "Próximas",
    color: "var(--muted)",
    icon: CalendarIcon,
    task: "Revisar contrato de alquiler",
    detail: "en 5 días",
  },
  {
    bucket: "Completadas",
    color: "var(--status-done)",
    icon: CheckIcon,
    task: "Preparar factura de agosto",
    detail: "ayer",
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

/** The 1-2-3 badges of the demo below, so the sentence and the animation read as one. */
function TopThree() {
  return (
    <span aria-hidden="true" className="inline-flex gap-1 align-[-0.25em]">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className="tabular inline-flex size-[22px] items-center justify-center rounded-full bg-accent-soft text-[12px] font-bold text-accent"
        >
          {n}
        </span>
      ))}
    </span>
  );
}

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
          className={`${container} grid items-start gap-8 pt-12 pb-12 sm:gap-12 md:pt-16 md:pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12 lg:items-center`}
        >
          <div className="mx-auto flex w-full max-w-[34rem] flex-col items-start gap-6 sm:max-w-[40rem] sm:items-center sm:text-center md:gap-7 lg:mx-0 lg:max-w-[34rem] lg:items-start lg:text-left">
            <h1 className="text-[2.5rem] leading-[1.02] font-semibold tracking-[-0.04em] text-balance md:text-hero">
              Un gestor de tareas que te dice cuál hacer primero.
            </h1>
            <p className="text-[17px] leading-[1.55] text-muted md:text-[18px] md:leading-[1.6]">
              Organiza tus tareas por grupo y ponles prioridad y fecha límite.
              Taskev las junta en una sola lista ordenada: las tres de{" "}
              <span className="whitespace-nowrap">
                arriba <TopThree /> son tu día.
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1 sm:justify-center sm:gap-3 md:pt-2 lg:justify-start">
              <CtaLink href="/register">Crear mi cuenta</CtaLink>
              <SecondaryLink href="#como-funciona">Cómo funciona</SecondaryLink>
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
              className="max-w-[28rem] scroll-mt-24 text-headline font-semibold text-balance"
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
                  Tareas las agrupa por vencimiento
                </h3>
                <div className="mt-4 overflow-hidden rounded-panel border border-line bg-surface">
                  <ul className="divide-y divide-line">
                    {TASK_BUCKETS.map(
                      ({ bucket, color, icon: Icon, task, detail }) => (
                        <li
                          key={bucket}
                          className="flex items-center gap-3 px-3 py-3 sm:px-4"
                        >
                          <span
                            className="flex size-9 shrink-0 items-center justify-center rounded-control"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
                              color,
                            }}
                          >
                            <Icon className="size-[18px]" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{bucket}</p>
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
                Crea tu primer grupo y deja que Taskev ordene el resto.
              </h2>
              <p className="mt-3 opacity-85">
                Añade unas tareas, abre Hoy y la siguiente ya estará marcada.
              </p>
            </div>
            <div className="md:shrink-0">
              <CtaLink href="/register" inverse>
                Crear mi cuenta
              </CtaLink>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
