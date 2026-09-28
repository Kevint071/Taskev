import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireOwnedGroup } from "@/lib/auth-guard";
import { deleteGroup, updateGroup } from "@/lib/data/mutations";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireOwnedGroup(id);
  if ("response" in guard) return guard.response;
  const { group } = guard;

  const groupTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.groupId, id))
    .orderBy(asc(tasks.position));

  return NextResponse.json({ ...group, tasks: groupTasks });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireOwnedGroup(id);
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  const result = await updateGroup(id, body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(result.value);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireOwnedGroup(id);
  if ("response" in guard) return guard.response;

  await deleteGroup(id);

  return NextResponse.json({ message: "Grupo eliminado" });
}
