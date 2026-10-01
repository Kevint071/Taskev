"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { LockIcon, MailIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { getAvatarColor } from "@/lib/avatar";
import { MAX_NAME_LENGTH } from "@/lib/constraints";
import { Card, CardFooter, CardHeader, Saved } from "./settings-card";
import { useProfileForm } from "./use-profile-form";

export function ProfileSection({
  email,
  name: initialName,
}: {
  email: string;
  name: string | null;
}) {
  const form = useProfileForm(initialName);

  // The card previews the name as it is typed, before it is saved.
  const identity = form.trimmed || email;
  const color = getAvatarColor(identity);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div
          aria-hidden="true"
          className="h-20 transition-colors duration-300"
          style={{
            background: `linear-gradient(120deg, color-mix(in srgb, ${color} 34%, var(--raised)), color-mix(in srgb, ${color} 8%, var(--raised)))`,
          }}
        />
        <div className="flex items-end gap-4 px-5 pb-5">
          <Avatar
            identity={identity}
            className="-mt-9 size-18 text-2xl ring-4 ring-raised"
          />
          <div className="min-w-0 pb-0.5">
            <p className="truncate text-section font-semibold">
              {form.trimmed || "Sin nombre"}
            </p>
            <p className="truncate text-muted">{email}</p>
          </div>
        </div>
      </Card>

      <Card>
        <form onSubmit={form.submit}>
          <CardHeader
            title="Nombre visible"
            description="Aparece en tu avatar y en la navegación. Si lo dejas vacío, se usa tu correo."
          />
          <div className="px-5 pt-4 pb-5">
            <Field
              label="Nombre"
              error={
                form.tooLong
                  ? `Máximo ${MAX_NAME_LENGTH} caracteres`
                  : form.error
              }
            >
              <Input
                value={form.name}
                autoComplete="name"
                placeholder="Cómo quieres que te llamemos"
                className="h-11 w-full"
                onChange={(e) => form.edit(e.target.value)}
              />
            </Field>
          </div>
          <CardFooter>
            <Saved message={form.saved} />
            {!form.unchanged && !form.pending ? (
              <Button variant="ghost" onClick={form.discard}>
                Descartar
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              disabled={form.pending || form.tooLong || form.unchanged}
            >
              {form.pending ? "Guardando…" : "Guardar"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sunken text-muted">
            <MailIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-meta text-muted">Correo electrónico</p>
            <p className="truncate font-medium">{email}</p>
          </div>
          <span
            title="El correo no se puede cambiar"
            className="flex items-center gap-1 rounded-full bg-sunken px-2.5 py-1 text-meta text-muted"
          >
            <LockIcon className="size-3.5" />
            Fijo
          </span>
        </div>
      </Card>
    </div>
  );
}
