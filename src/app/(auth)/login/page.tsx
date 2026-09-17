"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { AuthCard, TextLink } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Correo o contraseña incorrectos");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthCard
      title="Iniciar sesión"
      subtitle="Retoma donde lo dejaste."
      footer={
        <>
          ¿No tienes cuenta? <TextLink href="/register">Crear cuenta</TextLink>
        </>
      }
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
        <Field label="Contraseña">
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <FormError message={error} />
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="mt-1"
        >
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </AuthCard>
  );
}
