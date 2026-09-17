import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { MAX_NAME_LENGTH } from "@/lib/constraints";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.name !== "string") {
    return NextResponse.json(
      { error: "El nombre debe ser texto" },
      { status: 400 },
    );
  }

  const trimmed = body.name.trim();
  if (trimmed.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      {
        error: `El nombre puede tener como máximo ${MAX_NAME_LENGTH} caracteres`,
      },
      { status: 400 },
    );
  }

  const name = trimmed === "" ? null : trimmed;
  await db.update(users).set({ name }).where(eq(users.id, user.id));

  return NextResponse.json({ name });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (body?.confirmEmail !== user.email) {
    return NextResponse.json(
      { error: "Escribe el correo de tu cuenta para confirmar" },
      { status: 400 },
    );
  }

  // Projects, tasks, comments and reset tokens go with it via ON DELETE CASCADE.
  await db.delete(users).where(eq(users.id, user.id));

  return new NextResponse(null, { status: 204 });
}
