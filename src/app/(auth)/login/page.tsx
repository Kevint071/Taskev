"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { AuthCard, TextLink } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Toast, type ToastState } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setToast({
        id: Date.now(),
        message: "Correo o contraseña incorrectos",
        tone: "error",
      });
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
      <Toast toast={toast} onDismiss={() => setToast(null)} />
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
          <PasswordInput
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
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
