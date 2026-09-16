"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "El enlace ya no es válido");
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  if (!token) {
    return <p className="text-sm text-red-600">Enlace inválido.</p>;
  }

  if (success) {
    return (
      <p className="text-sm text-neutral-700">
        Contraseña actualizada. Redirigiendo a iniciar sesión...
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="password"
        required
        minLength={8}
        placeholder="Nueva contraseña (mínimo 8 caracteres)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded border border-neutral-300 px-3 py-2"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Restablecer contraseña"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Restablecer contraseña</h1>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
      <Link href="/login" className="text-sm underline">
        Volver a iniciar sesión
      </Link>
    </main>
  );
}
