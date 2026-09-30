"use client";

import { useEffect, useRef, useState } from "react";
import type { GroupSummary } from "@/components/group-types";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { handleUnauthenticated } from "@/lib/api-client";
import {
  MAX_GROUP_DESCRIPTION_LENGTH,
  MAX_GROUP_NAME_LENGTH,
} from "@/lib/constraints";

/** Modal to rename a group and write or change its description. Mount it to open it. */
export function EditGroupDialog({
  group,
  onSaved,
  onClose,
}: {
  group: GroupSummary;
  onSaved: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // showModal() restores focus to the opener when the dialog closes.
    ref.current?.showModal();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description.trim() || null,
        }),
      });
      if (handleUnauthenticated(res)) return;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar el grupo");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("No se pudo guardar el grupo. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={ref}
      aria-label="Editar grupo"
      onClose={onClose}
      data-motion-ok=""
      className="animate-dialog-pop m-auto w-[min(440px,calc(100vw-32px))] translate-y-[6dvh] overflow-hidden rounded-[28px] border border-line bg-raised p-0 text-ink shadow-2xl shadow-black/25 backdrop:animate-backdrop-in backdrop:bg-black/55 backdrop:backdrop-blur-[2px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <h2 className="text-section font-semibold">Editar grupo</h2>
        <Field label="Nombre">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_GROUP_NAME_LENGTH}
            className="w-full"
          />
        </Field>
        <Field
          label="Descripción"
          hint={`${description.length}/${MAX_GROUP_DESCRIPTION_LENGTH}`}
        >
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={MAX_GROUP_DESCRIPTION_LENGTH}
            rows={3}
            placeholder="¿Para qué es este grupo?"
            className="w-full resize-none"
          />
        </Field>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={pending || !name.trim()}
          >
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
