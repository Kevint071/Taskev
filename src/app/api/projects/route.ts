import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const includeArchived =
    new URL(request.url).searchParams.get("archived") === "true";

  const rows = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        includeArchived
          ? isNotNull(projects.archivedAt)
          : isNull(projects.archivedAt),
      ),
    );

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description : null;

  if (!name) {
    return NextResponse.json(
      { error: "El nombre del proyecto es requerido" },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(projects)
    .values({ userId, name, description })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
