"use client";

// Parked while PASSWORD_RESET_ENABLED is false. To re-enable, render
// <ForgotPasswordScreen /> from src/app/(auth)/forgot-password/page.tsx.

import { useState } from "react";
import { AuthCard, TextLink } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    setMessage(
      data.message ??
        "Si el correo tiene una cuenta registrada, se envió un enlace de restablecimiento.",
    );
  }

  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para crear una nueva."
      footer={<TextLink href="/login">Volver a iniciar sesión</TextLink>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Correo electrónico">
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>
      {message && <p className="text-muted">{message}</p>}
    </AuthCard>
  );
}
