"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
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
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Olvidé mi contraseña</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          required
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-neutral-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar enlace de restablecimiento"}
        </button>
      </form>
      {message && <p className="text-sm text-neutral-700">{message}</p>}
      <Link href="/login" className="text-sm underline">
        Volver a iniciar sesión
      </Link>
    </main>
  );
}
