export type Project = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type ProjectSummary = Project & {
  openCount: number;
  taskCount: number;
  avgProgress: number;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: "disponible" | "en_curso" | "bloqueada" | "pausada" | "completada";
  progressPct: number;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type GlobalTask = Task & {
  projectName: string;
  blocked: boolean;
  relevance: number | null;
};

export type TaskComment = {
  id: string;
  taskId: string;
  body: string;
  createdAt: string;
};

export const STATUS_LABELS: Record<Task["status"], string> = {
  disponible: "Disponible",
  en_curso: "En curso",
  bloqueada: "Bloqueada",
  pausada: "Pausada",
  completada: "Completada",
};
