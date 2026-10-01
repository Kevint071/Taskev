"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/field";
import { LogOutIcon, TrashIcon } from "@/components/ui/icons";
import { ActionRow, Card } from "./settings-card";

export function AccountSection({ email }: { email: string }) {
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
    <div className="flex flex-col gap-4">
      <Card>
        <ActionRow
          icon={<LogOutIcon />}
          title="Cerrar sesión"
          description="Sal de Taskev en este dispositivo."
        >
          <Button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="col-span-2 sm:col-span-1"
          >
            Cerrar sesión
          </Button>
        </ActionRow>
      </Card>

      <Card className="border-danger/30">
        <ActionRow
          tone="danger"
          icon={<TrashIcon />}
          title="Eliminar cuenta"
          description="Borra tu cuenta y todos tus grupos, tareas y comentarios. No se puede deshacer."
        >
          <Button
            variant="danger"
            onClick={() => setOpen(true)}
            className="col-span-2 sm:col-span-1"
          >
            Eliminar cuenta
          </Button>
        </ActionRow>
        {error ? (
          <div className="border-t border-danger/20 bg-danger/5 px-5 py-3">
            <FormError message={error} />
          </div>
        ) : null}
      </Card>

      <ConfirmDialog
        open={open}
        title="¿Eliminar tu cuenta?"
        description="Se borrarán tu cuenta y todos tus grupos, tareas y comentarios. No se puede deshacer."
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
    </div>
  );
}
