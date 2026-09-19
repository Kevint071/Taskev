import Link from "next/link";
import { Brand } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { ProgressChip } from "@/components/ui/progress-chip";
import { StatusDot } from "@/components/ui/status-badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const SAMPLE = [
  {
    title: "Enviar propuesta al cliente",
    project: "Estudio",
    due: "hoy",
    progress: 60,
    status: "en_curso",
  },
  {
    title: "Revisar contrato de alquiler",
    project: "Casa",
    due: "18 sept",
    progress: 20,
    status: "disponible",
  },
  {
    title: "Renovar dominio",
    project: "Web personal",
    due: "venció",
    progress: 0,
    status: "bloqueada",
  },
  {
    title: "Preparar charla de octubre",
    project: "Comunidad",
    due: "2 oct",
    progress: 35,
    status: "en_curso",
  },
] as const;

export function Landing() {
  return (
    <div className="flex min-w-0 min-h-dvh flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-4 py-5 md:px-8">
        <Brand />
        <nav className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost">
            Entrar
          </ButtonLink>
          <ButtonLink href="/register" variant="primary">
            Crear cuenta
          </ButtonLink>
        </nav>
      </header>

      <main className="mx-auto grid min-w-0 w-full max-w-[1120px] flex-1 items-center gap-12 px-4 pt-8 pb-16 md:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <div className="flex max-w-[34rem] flex-col items-start gap-6">
          <h1 className="text-display font-semibold">
            Sabe siempre qué hacer ahora.
          </h1>
          <p className="text-body text-muted">
            Taskev reúne tus proyectos y tareas, y los ordena por prioridad y
            fecha límite. Abres la app y la siguiente tarea ya está marcada.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink
              href="/register"
              variant="primary"
              className="h-11 px-5"
            >
              Empezar ahora
            </ButtonLink>
            <ButtonLink href="/login" className="h-11 px-5">
              Ya tengo cuenta
            </ButtonLink>
          </div>
        </div>

        <figure aria-label="Ejemplo del panel Hoy" className="min-w-0 w-full">
          <div className="rounded-panel border border-line bg-raised p-2 shadow-[0_24px_60px_-30px_rgba(26,35,50,0.3)]">
            <div className="flex items-center justify-between px-3 pt-2 pb-3">
              <span className="font-semibold">Hoy</span>
              <span className="text-meta text-muted">4 abiertas</span>
            </div>
            <ol className="flex flex-col">
              {SAMPLE.map((task, i) => (
                <li
                  key={task.title}
                  className={`flex items-center gap-3 rounded-control px-3 py-3 ${
                    i === 0
                      ? "bg-accent-soft shadow-[inset_3px_0_0_var(--accent)]"
                      : ""
                  }`}
                >
                  <StatusDot status={task.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{task.title}</p>
                    <p className="flex gap-3 truncate text-meta text-muted">
                      <span className="truncate">{task.project}</span>
                      <span
                        className={
                          task.due === "venció" ? "text-danger" : undefined
                        }
                      >
                        {task.due}
                      </span>
                    </p>
                  </div>
                  <ProgressChip value={task.progress} />
                </li>
              ))}
            </ol>
          </div>
          <figcaption className="mt-3 px-1 text-meta text-muted">
            La tarea resaltada es la que más importa ahora.
          </figcaption>
        </figure>
      </main>

      <footer className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-4 border-t border-line px-4 py-5 text-meta text-muted md:px-8">
        <span>Taskev</span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="whitespace-nowrap hover:text-ink">
            Iniciar sesión
          </Link>
          <ThemeToggle compact />
        </div>
      </footer>
    </div>
  );
}
