"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/constraints";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="border-b border-line pb-4">
        <h2 className="text-section font-semibold">{title}</h2>
        <p className="mt-1 text-muted">{description}</p>
      </div>
      <div className="flex min-w-0 max-w-[480px] flex-col gap-4">
        {children}
      </div>
    </section>
  );
}

function Saved({ message }: { message: string | null }) {
  if (!message) return null;
  return <output className="text-meta text-status-done">{message}</output>;
}

export function AppearanceSection() {
  return (
    <Section
      title="Apariencia"
      description="Sistema sigue la configuración de tu dispositivo."
    >
      <div>
        <ThemeToggle />
      </div>
    </Section>
  );
}

export function ProfileSection({
  email,
  name: initialName,
}: {
  email: string;
  name: string | null;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(initialName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const tooLong = name.trim().length > MAX_NAME_LENGTH;
  const unchanged = name.trim() === (initialName ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    setPending(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar el nombre");
      return;
    }
    setName(data.name ?? "");
    setSaved(data.name ? "Nombre guardado" : "Nombre eliminado");
    await update({ name: data.name });
    router.refresh();
  }

  return (
    <Section
      title="Perfil"
      description="Tu nombre aparece en la navegación en lugar del correo."
    >
      <Field label="Correo electrónico">
        <Input value={email} readOnly disabled />
      </Field>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field
          label="Nombre"
          error={tooLong ? `Máximo ${MAX_NAME_LENGTH} caracteres` : error}
          hint="Déjalo vacío para mostrar tu correo."
        >
          <Input
            value={name}
            autoComplete="name"
            onChange={(e) => {
              setName(e.target.value);
              setSaved(null);
            }}
          />
        </Field>
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={pending || tooLong || unchanged}
          >
            {pending ? "Guardando…" : "Guardar nombre"}
          </Button>
          <Saved message={saved} />
        </div>
      </form>
    </Section>
  );
}

export function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    setPending(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo cambiar la contraseña");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setSaved("Contraseña cambiada");
  }

  return (
    <Section
      title="Contraseña"
      description="Necesitas tu contraseña actual para cambiarla."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field label="Contraseña actual">
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>
        <Field
          label="Nueva contraseña"
          hint={`Al menos ${MIN_PASSWORD_LENGTH} caracteres`}
        >
          <Input
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
        <FormError message={error} />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Cambiando…" : "Cambiar contraseña"}
          </Button>
          <Saved message={saved} />
        </div>
      </form>
    </Section>
  );
}

export function DeleteAccountSection({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmEmail: email }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setPending(false);
      setOpen(false);
      setError(data.error ?? "No se pudo eliminar la cuenta");
      return;
    }
    await signOut({ callbackUrl: "/" });
  }

  return (
    <Section
      title="Eliminar cuenta"
      description="Borra tu cuenta y todos tus proyectos, tareas y comentarios."
    >
      <div className="flex flex-col items-start gap-3 rounded-panel border border-danger/40 p-4">
        <p>
          Esta acción es permanente. No hay forma de recuperar los datos
          después.
        </p>
        <Button variant="danger" onClick={() => setOpen(true)}>
          Eliminar mi cuenta
        </Button>
        <FormError message={error} />
      </div>
      <ConfirmDialog
        open={open}
        title="¿Eliminar tu cuenta?"
        description="Se borrarán tu cuenta y todos tus proyectos, tareas y comentarios. No se puede deshacer."
        confirmLabel="Eliminar cuenta"
        confirmText={email}
        confirmTextLabel={
          <>
            Escribe <strong className="text-ink">{email}</strong> para confirmar
          </>
        }
        pending={pending}
        onConfirm={handleDelete}
        onClose={() => setOpen(false)}
      />
    </Section>
  );
}
