import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { PASSWORD_RESET_TOKEN_TTL_MS } from "@/lib/constraints";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";
import { generateResetToken } from "@/lib/tokens";

// Always responds the same way regardless of whether the email exists,
// so we never reveal account existence to the caller.
function genericResponse() {
  return NextResponse.json({
    message:
      "Si el correo tiene una cuenta registrada, se envió un enlace de restablecimiento.",
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "Correo requerido" }, { status: 400 });
  }

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return genericResponse();
  }

  const { token, tokenHash } = generateResetToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const resetUrl = `${origin}/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (err) {
    console.error("Failed to send password reset email", err);
  }

  return genericResponse();
}
