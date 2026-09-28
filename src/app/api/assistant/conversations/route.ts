import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-guard";
import { listConversations } from "@/lib/data/conversations";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return NextResponse.json(await listConversations(userId));
}
