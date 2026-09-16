import bcrypt from "bcrypt";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { MIN_PASSWORD_LENGTH } from "@/lib/constraints";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { hashResetToken } from "@/lib/tokens";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!token) {
    return NextResponse.json({ error: "Enlace inválido" }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      {
        error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
      },
      { status: 400 },
    );
  }

  const tokenHash = hashResetToken(token);

  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);

  if (!resetToken || resetToken.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "El enlace ya no es válido" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, resetToken.userId));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, resetToken.id));

  return NextResponse.json({ message: "Contraseña actualizada" });
}
