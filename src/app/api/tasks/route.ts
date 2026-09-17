import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-guard";
import { getUserTaskOverview } from "@/lib/data/overview";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { tasks } = await getUserTaskOverview(userId, new Date());
  return NextResponse.json(tasks);
}
