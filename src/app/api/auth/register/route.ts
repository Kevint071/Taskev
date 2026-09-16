import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { MIN_PASSWORD_LENGTH } from "@/lib/constraints";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Correo electrónico inválido" },
      { status: 400 },
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      {
        error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
      },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "El correo ya está en uso" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [created] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning({ id: users.id, email: users.email });

  return NextResponse.json(
    { id: created.id, email: created.email },
    { status: 201 },
  );
}
