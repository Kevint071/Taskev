import { NextResponse } from "next/server";
import { parseTitle } from "@/lib/ai/conversations";
import { requireUserId } from "@/lib/auth-guard";
import {
  deleteConversation,
  getOwnedConversation,
  renameConversation,
} from "@/lib/data/repositories/conversations";

type Params = { params: Promise<{ id: string }> };

function unauthenticated() {
  return NextResponse.json({ error: "No autenticado" }, { status: 401 });
}

function notFound() {
  return NextResponse.json(
    { error: "Esta conversación ya no existe" },
    { status: 404 },
  );
}

/** The transcript and pending action; the model context stays server-side. */
export async function GET(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return unauthenticated();
  const { id } = await params;

  const conversation = await getOwnedConversation(userId, id);
  if (!conversation) return notFound();
  const { title, provider, updatedAt, transcript, pending } = conversation;
  return NextResponse.json({
    id: conversation.id,
    title,
    provider,
    updatedAt,
    transcript,
    pending,
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return unauthenticated();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = parseTitle(body?.title);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const renamed = await renameConversation(userId, id, parsed.title);
  return renamed ? NextResponse.json(renamed) : notFound();
}

export async function DELETE(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return unauthenticated();
  const { id } = await params;

  return (await deleteConversation(userId, id))
    ? new NextResponse(null, { status: 204 })
    : notFound();
}
