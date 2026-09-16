import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { projects, tasks } from "@/lib/db/schema";
import { computeRelevance } from "@/lib/relevance";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const rows = await db
    .select({ task: tasks, projectName: projects.name })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(projects.userId, userId), isNull(projects.archivedAt)));

  const now = new Date();

  const active = rows
    .filter((r) => r.task.status !== "completada")
    .map((r) => ({
      ...r.task,
      projectName: r.projectName,
      blocked: r.task.status === "bloqueada",
      relevance: computeRelevance(Number(r.task.priority), r.task.dueDate, now),
    }))
    .sort((a, b) => b.relevance - a.relevance);

  const completed = rows
    .filter((r) => r.task.status === "completada")
    .map((r) => ({
      ...r.task,
      projectName: r.projectName,
      blocked: false,
      relevance: null as number | null,
    }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return NextResponse.json([...active, ...completed]);
}
