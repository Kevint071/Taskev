import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  isStrongPassword,
  PASSWORD_REQUIREMENTS_ERROR,
} from "@/lib/password-checks";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const currentPassword =
    typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!isStrongPassword(newPassword)) {
    return NextResponse.json(
      { error: `La nueva contraseña ${PASSWORD_REQUIREMENTS_ERROR}` },
      { status: 400 },
    );
  }

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const valid =
    user && (await bcrypt.compare(currentPassword, user.passwordHash));
  if (!valid) {
    return NextResponse.json(
      { error: "La contraseña actual no es correcta" },
      { status: 403 },
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

  return NextResponse.json({ message: "Contraseña actualizada" });
}
