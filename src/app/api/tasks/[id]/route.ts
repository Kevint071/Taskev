import { NextResponse } from "next/server";
import { requireOwnedTask } from "@/lib/auth-guard";
import { deleteTask, updateTask } from "@/lib/data/mutations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireOwnedTask(id);
  if ("response" in guard) return guard.response;

  return NextResponse.json(guard.task);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireOwnedTask(id);
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  const result = await updateTask(guard.task, body);
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
  const guard = await requireOwnedTask(id);
  if ("response" in guard) return guard.response;

  await deleteTask(id);

  return NextResponse.json({ message: "Tarea eliminada" });
}
