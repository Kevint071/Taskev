"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/nav-bar";
import { type GlobalTask, STATUS_LABELS } from "@/components/project-types";
import { handleUnauthenticated } from "@/lib/api-client";

export default function GlobalTasksPage() {
  const [tasks, setTasks] = useState<GlobalTask[] | null>(null);

  useEffect(() => {
    fetch("/api/tasks").then(async (res) => {
      if (handleUnauthenticated(res)) return;
      setTasks(await res.json());
    });
  }, []);

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold">Todas mis tareas</h1>
        <p className="text-sm text-neutral-500">
          Ordenadas automáticamente por relevancia (prioridad + urgencia por
          fecha límite). Las completadas van al final.
        </p>

        {tasks === null ? (
          <p className="text-sm text-neutral-500">Cargando...</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-neutral-500">No tienes tareas todavía.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className={`rounded border p-3 ${
                  task.status === "completada"
                    ? "border-neutral-200 bg-neutral-50 opacity-60"
                    : task.blocked
                      ? "border-amber-300 bg-amber-50"
                      : "border-neutral-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/projects/${task.projectId}`}
                    className="font-medium hover:underline"
                  >
                    {task.title}
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    {task.blocked && (
                      <span className="rounded bg-amber-200 px-2 py-0.5 text-amber-800">
                        Bloqueada
                      </span>
                    )}
                    <span>{STATUS_LABELS[task.status]}</span>
                  </div>
                </div>
                <div className="mt-1 text-sm text-neutral-500">
                  {task.projectName} · Prioridad {task.priority}
                  {task.dueDate &&
                    ` · Vence ${new Date(task.dueDate).toLocaleDateString()}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
