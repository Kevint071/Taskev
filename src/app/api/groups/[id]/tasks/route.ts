import { NextResponse } from "next/server";
import { requireOwnedGroup } from "@/lib/auth-guard";
import { createTask } from "@/lib/data/services";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id: groupId } = await params;
  const guard = await requireOwnedGroup(groupId);
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  const result = await createTask(groupId, body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(result.value, { status: 201 });
}
