"use client";

import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import {
  FieldStatus,
  PasswordRequirements,
} from "@/components/ui/password-requirements";
import { Toast } from "@/components/ui/toast";
import { Card, CardFooter, CardHeader } from "./settings-card";
import { usePasswordForm } from "./use-password-form";

export function PasswordSection() {
  const form = usePasswordForm();

  return (
    <Card>
      <Toast toast={form.toast} onDismiss={form.dismissToast} />
      <form onSubmit={form.submit}>
        <CardHeader
          title="Cambiar contraseña"
          description="Primero confirma la actual; después elige una nueva."
        />
        <div className="flex flex-col gap-4 px-5 pt-4 pb-5">
          <Field label="Contraseña actual">
            <PasswordInput
              required
              autoComplete="current-password"
              value={form.values.current}
              onChange={form.onChange.current}
            />
          </Field>
          <div className="h-px bg-line" />
          <div className="flex flex-col gap-2.5">
            <Field label="Nueva contraseña">
              <PasswordInput
                required
                autoComplete="new-password"
                value={form.values.next}
                onChange={form.onChange.next}
              />
            </Field>
            <PasswordRequirements
              rules={form.rules}
              label="Requisitos de la nueva contraseña"
            />
            <FieldStatus show={form.sameAsCurrent} tone="warn">
              Es igual a tu contraseña actual
            </FieldStatus>
          </div>
          <div className="flex flex-col gap-2">
            <Field label="Repite la nueva contraseña">
              <PasswordInput
                required
                autoComplete="new-password"
                value={form.values.confirm}
                onChange={form.onChange.confirm}
              />
            </Field>
            <FieldStatus
              show={form.values.confirm.length > 0}
              tone={form.matches ? "ok" : "idle"}
            >
              {form.matches
                ? "Las contraseñas coinciden"
                : "Todavía no coinciden"}
            </FieldStatus>
          </div>
          <FormError message={form.error} />
        </div>
        <CardFooter>
          <Button
            type="submit"
            variant="primary"
            disabled={form.pending || !form.ready}
          >
            {form.pending ? "Actualizando…" : "Actualizar contraseña"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
