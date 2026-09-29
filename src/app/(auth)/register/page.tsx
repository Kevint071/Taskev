"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { AuthCard, TextLink } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordChecklist } from "@/components/ui/password-requirements";
import { Toast, type ToastState } from "@/components/ui/toast";
import { passwordRules } from "@/lib/password-checks";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const rules = passwordRules(password);
  const ready = rules.every((rule) => rule.ok);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.error ?? "No se pudo crear la cuenta";
      // A taken email is not a form-wide problem: flag it top-right, like other failures.
      if (res.status === 409) {
        setToast({ id: Date.now(), message, tone: "error" });
      } else {
        setError(message);
      }
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      router.push("/login");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthCard
      title="Crear cuenta"
      subtitle="Tus grupos y tareas, ordenados por lo que importa hoy."
      footer={
        <>
          ¿Ya tienes cuenta? <TextLink href="/login">Iniciar sesión</TextLink>
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
        <div className="flex flex-col gap-2.5">
          <Field label="Contraseña">
            <PasswordInput
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
            />
          </Field>
          <PasswordChecklist rules={rules} />
        </div>
        <FormError message={error} />
        <Button
          type="submit"
          variant="primary"
          disabled={loading || !ready}
          className="mt-1"
        >
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>
    </AuthCard>
  );
}
