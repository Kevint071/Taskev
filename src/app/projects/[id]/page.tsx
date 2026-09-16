"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/nav-bar";
import {
  type Project,
  STATUS_LABELS,
  type Task,
  type TaskComment,
} from "@/components/project-types";
import { handleUnauthenticated } from "@/lib/api-client";

type ProjectDetail = Project & { tasks: Task[] };

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/projects/${id}`);
    if (handleUnauthenticated(res)) return;
    if (res.status === 404) {
      router.push("/projects");
      return;
    }
    const data = await res.json();
    setProject(data);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load reads `id` via closure and is redefined every render
  useEffect(() => {
    load();
  }, [id]);

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/projects/${id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTaskTitle }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear la tarea");
      return;
    }
    setNewTaskTitle("");
    load();
  }

  async function updateTask(taskId: string, updates: Record<string, unknown>) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    load();
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    load();
  }

  async function handleDrop(targetId: string) {
    if (!project || !draggedId || draggedId === targetId) return;
    const tasks = [...project.tasks];
    const draggedIndex = tasks.findIndex((t) => t.id === draggedId);
    const [dragged] = tasks.splice(draggedIndex, 1);
    const insertAt = tasks.findIndex((t) => t.id === targetId);
    tasks.splice(insertAt, 0, dragged);

    const newIndex = tasks.findIndex((t) => t.id === draggedId);
    const beforeTaskId = newIndex > 0 ? tasks[newIndex - 1].id : null;
    const afterTaskId =
      newIndex < tasks.length - 1 ? tasks[newIndex + 1].id : null;

    setProject({ ...project, tasks });
    setDraggedId(null);

    await fetch(`/api/tasks/${draggedId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beforeTaskId, afterTaskId }),
    });
    load();
  }

  async function toggleArchive() {
    if (!project) return;
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !project.archivedAt }),
    });
    load();
  }

  async function handleDeleteProject() {
    if (
      !confirm(
        "¿Eliminar este proyecto y todas sus tareas y comentarios permanentemente?",
      )
    ) {
      return;
    }
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/projects");
  }

  if (!project) {
    return (
      <>
        <NavBar />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
          <p className="text-sm text-neutral-500">Cargando...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-neutral-500">{project.description}</p>
            )}
            {project.archivedAt && (
              <p className="text-sm text-amber-600">Archivado</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleArchive}
              className="rounded border border-neutral-300 px-3 py-1 text-sm"
            >
              {project.archivedAt ? "Desarchivar" : "Archivar"}
            </button>
            <button
              type="button"
              onClick={handleDeleteProject}
              className="rounded border border-red-300 px-3 py-1 text-sm text-red-600"
            >
              Eliminar
            </button>
          </div>
        </div>

        <form onSubmit={handleAddTask} className="flex gap-2">
          <input
            type="text"
            placeholder="Nueva tarea"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 rounded border border-neutral-300 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded bg-neutral-900 px-4 py-2 text-white"
          >
            Agregar
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <ul className="flex flex-col gap-2">
          {project.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              expanded={expandedTaskId === task.id}
              onToggleExpand={() =>
                setExpandedTaskId(expandedTaskId === task.id ? null : task.id)
              }
              onDragStart={() => setDraggedId(task.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(task.id)}
              onUpdate={(updates) => updateTask(task.id, updates)}
              onDelete={() => deleteTask(task.id)}
            />
          ))}
        </ul>
      </main>
    </>
  );
}

function TaskRow({
  task,
  expanded,
  onToggleExpand,
  onDragStart,
  onDragOver,
  onDrop,
  onUpdate,
  onDelete,
}: {
  task: Task;
  expanded: boolean;
  onToggleExpand: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onUpdate: (updates: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="cursor-move rounded border border-neutral-200 bg-white p-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-neutral-400" aria-hidden>
          ⠿
        </span>
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 text-left font-medium"
        >
          {task.title}
        </button>
        <select
          value={task.status}
          onChange={(e) => onUpdate({ status: e.target.value })}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onDelete}
          className="text-sm text-red-600"
        >
          Eliminar
        </button>
      </div>

      {expanded && <TaskDetails task={task} onUpdate={onUpdate} />}
    </li>
  );
}

function TaskDetails({
  task,
  onUpdate,
}: {
  task: Task;
  onUpdate: (updates: Record<string, unknown>) => void;
}) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [description, setDescription] = useState(task.description ?? "");

  useEffect(() => {
    fetch(`/api/tasks/${task.id}/comments`)
      .then((r) => r.json())
      .then(setComments);
  }, [task.id]);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    const res = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newComment }),
    });
    const created = await res.json();
    setComments([...comments, created]);
    setNewComment("");
  }

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-neutral-100 pt-3 text-sm">
      <label className="flex flex-col gap-1">
        Descripción
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => onUpdate({ description })}
          className="rounded border border-neutral-300 px-2 py-1"
        />
      </label>

      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1">
          Avance ({task.progressPct}%)
          <input
            type="range"
            min={0}
            max={100}
            defaultValue={task.progressPct}
            onChange={(e) => onUpdate({ progressPct: Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1">
          Prioridad
          <input
            type="number"
            step="0.1"
            defaultValue={task.priority}
            onBlur={(e) => onUpdate({ priority: Number(e.target.value) })}
            className="w-24 rounded border border-neutral-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Fecha límite
          <input
            type="date"
            defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ""}
            onChange={(e) =>
              onUpdate({
                dueDate: e.target.value ? e.target.value : null,
              })
            }
            className="rounded border border-neutral-300 px-2 py-1"
          />
        </label>
      </div>

      <div>
        <p className="font-medium">Comentarios</p>
        <ul className="flex flex-col gap-1 py-2">
          {comments.map((c) => (
            <li key={c.id} className="text-neutral-700">
              <span className="text-neutral-400">
                {new Date(c.createdAt).toLocaleString()} —{" "}
              </span>
              {c.body}
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            placeholder="Agregar comentario"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 rounded border border-neutral-300 px-2 py-1"
          />
          <button
            type="submit"
            className="rounded bg-neutral-900 px-3 py-1 text-white"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
