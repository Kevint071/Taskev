import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { STATUS_LABELS, type Task } from "@/components/group-types";
import { ButtonLink } from "@/components/ui/button";
import { PinIcon } from "@/components/ui/icons";
import { STATUS_TONE } from "@/components/ui/status-badge";
import { CtaLink, SecondaryLink } from "./cta-link";
import {
  AssistantMock,
  BucketsMock,
  CalendarMock,
  CommentMock,
  GroupsMock,
  RankingBoard,
  StatusTile,
  TaskFormMock,
  ThemesMock,
  TodayStepMock,
} from "./landing-mocks";
import { TaskFlow } from "./task-flow";

const container = "mx-auto w-full max-w-280 px-4 md:px-8";

const STEPS: {
  title: string;
  text: string;
  mock: ReactNode;
}[] = [
  {
    title: "Crea un grupo",
    text: "Un grupo reúne las tareas que comparten un objetivo: un cliente, la casa, un viaje.",
    mock: <GroupsMock />,
  },
  {
    title: "Añade tus tareas",
    text: "Ponles prioridad y fecha límite si las tienen. Ninguna de las dos es obligatoria.",
    mock: <TaskFormMock />,
  },
  {
    title: "Abre Hoy",
    text: "Taskev suma la prioridad y la cercanía de la fecha: lo vencido y lo de hoy pesa más. Las tres primeras quedan marcadas.",
    mock: <TodayStepMock />,
  },
];

const RANKING_POINTS = [
  {
    title: "La prioridad la pones tú",
    text: "Cada punto de prioridad suma 20. Una tarea sin fecha compite solo con ella.",
  },
  {
    title: "La fecha pesa más cuanto más cerca",
    text: "Lo vencido y lo de hoy suman hasta 100 puntos. Esa ventaja se reduce poco a poco a medida que la fecha se aleja.",
  },
  {
    title: "El avance no cambia el orden",
    text: "Una tarea al 90 % no baja en la lista. Solo desempata cuando dos pesan lo mismo.",
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

const card = "rounded-panel border border-line bg-raised p-5 md:p-6";

/** The 1-2-3 badges of the demo below, so the sentence and the animation read as one. */
function TopThree() {
  return (
    <span aria-hidden="true" className="inline-flex gap-1 align-[-0.25em]">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className="tabular inline-flex size-5.5 items-center justify-center rounded-full bg-accent-soft text-[0.75rem] font-bold text-accent"
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
          <div className="mx-auto flex w-full max-w-136 flex-col items-start gap-6 sm:max-w-160 sm:items-center sm:text-center md:gap-7 lg:mx-0 lg:max-w-136 lg:items-start lg:text-left">
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
          <div className={`${container} py-14 md:py-24`}>
            <h2
              id="como-funciona"
              className="max-w-md scroll-mt-24 text-headline font-semibold text-balance"
            >
              Tres pasos y ya tienes el día ordenado
            </h2>
            <ol className="mt-10 grid gap-10 md:mt-14 md:grid-cols-3 md:gap-8 lg:gap-10">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-ui font-bold text-accent-ink"
                    >
                      {i + 1}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="hidden h-px flex-1 bg-line-strong md:block"
                      />
                    )}
                  </div>
                  <h3 className="mt-4 text-section font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-104 text-muted">{step.text}</p>
                  <div className="mt-5 flex-1 md:mt-6">{step.mock}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="que-va-primero"
          className="border-y border-line bg-sunken"
        >
          <div
            className={`${container} grid items-center gap-10 py-14 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16`}
          >
            <div>
              <h2
                id="que-va-primero"
                className="max-w-lg text-headline font-semibold text-balance"
              >
                Sin magia: una suma que puedes ver
              </h2>
              <p className="mt-4 max-w-120 text-[17px] leading-[1.6] text-muted">
                Cada barra de Hoy es la suma de dos cosas. Por eso sabes por qué
                una tarea va antes que otra.
              </p>
              <dl className="mt-8 flex flex-col gap-6">
                {RANKING_POINTS.map((point) => (
                  <div
                    key={point.title}
                    className="border-l-2 border-accent pl-4"
                  >
                    <dt className="font-semibold">{point.title}</dt>
                    <dd className="mt-1 max-w-120 text-muted">
                      {point.text}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <RankingBoard />
          </div>
        </section>

        <section aria-labelledby="por-dentro">
          <div className={`${container} py-14 md:py-24`}>
            <h2
              id="por-dentro"
              className="max-w-lg text-headline font-semibold text-balance"
            >
              Distingue lo que puedes hacer de lo que está esperando
            </h2>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 md:mt-10 lg:grid-cols-5">
              {STATES.map(({ status, meaning }) => (
                <StatusTile
                  key={status}
                  status={status}
                  label={STATUS_LABELS[status]}
                  meaning={meaning}
                  tone={STATUS_TONE[status]}
                />
              ))}
            </div>

            <div className="mt-14 grid items-center gap-8 md:mt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
              <div>
                <h3 className="max-w-md text-page font-semibold text-balance">
                  Tus tareas, agrupadas por vencimiento
                </h3>
                <p className="mt-3 max-w-120 text-muted">
                  La lista de tareas separa lo vencido, lo de hoy y lo que
                  viene, y deja las completadas al final. Sin filtros que
                  configurar para saber qué se te ha pasado.
                </p>
              </div>
              <BucketsMock />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="extras"
          className="border-t border-line bg-sunken"
        >
          <div className={`${container} py-14 md:py-24`}>
            <h2
              id="extras"
              className="max-w-lg text-headline font-semibold text-balance"
            >
              Y todo lo que hace falta alrededor
            </h2>

            <div className="mt-8 grid gap-4 md:mt-10 lg:grid-cols-3">
              <article className={`${card} lg:col-span-2`}>
                <h3 className="text-section font-semibold">Asistente</h3>
                <p className="mt-2 max-w-136 text-muted">
                  Escribe <span className="font-medium text-ink">/crear</span>,{" "}
                  <span className="font-medium text-ink">/vencen</span> o{" "}
                  <span className="font-medium text-ink">/priorizar</span>, o
                  pregúntale con tus palabras. Crea tareas, añade comentarios y
                  resume lo que hiciste hoy.
                </p>
                <div className="mt-5 max-w-lg">
                  <AssistantMock />
                </div>
              </article>

              <article className={card}>
                <h3 className="text-section font-semibold">Comentarios</h3>
                <p className="mt-2 text-muted">
                  Deja notas y decisiones dentro de cada tarea, con su fecha.
                </p>
                <div className="mt-5">
                  <CommentMock />
                </div>
              </article>

              <article className={card}>
                <h3 className="text-section font-semibold">Calendario</h3>
                <p className="mt-2 text-muted">
                  Elige la fecha límite en un calendario en lugar de escribirla.
                </p>
                <div className="mt-5">
                  <CalendarMock />
                </div>
              </article>

              <article className={card}>
                <h3 className="text-section font-semibold">Fijar para hoy</h3>
                <p className="mt-2 text-muted">
                  ¿Algo no puede esperar aunque no sea lo más relevante? Fíjalo
                  y aparece en Hoy.
                </p>
                <div className="mt-5">
                  <span
                    aria-hidden="true"
                    className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-2 font-medium text-accent"
                  >
                    <PinIcon filled className="size-4" />
                    Fijada para hoy
                  </span>
                </div>
              </article>

              <article className={card}>
                <h3 className="text-section font-semibold">Claro y oscuro</h3>
                <p className="mt-2 text-muted">
                  Elige un tema en Ajustes o deja que siga el de tu dispositivo.
                </p>
                <div className="mt-5">
                  <ThemesMock />
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="empezar"
          className="bg-accent text-accent-ink"
        >
          <div
            className={`${container} flex flex-col items-start gap-6 py-14 md:flex-row md:items-center md:justify-between md:py-20`}
          >
            <div className="max-w-136">
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

      <footer className="border-t border-line">
        <div
          className={`${container} flex flex-wrap items-center justify-between gap-4 py-6`}
        >
          <Brand />
          <nav aria-label="Pie" className="flex items-center gap-1">
            <ButtonLink href="/login" variant="ghost">
              Entrar
            </ButtonLink>
            <ButtonLink href="/register" variant="ghost">
              Crear cuenta
            </ButtonLink>
          </nav>
        </div>
      </footer>
    </div>
  );
}
