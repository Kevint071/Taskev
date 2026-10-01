"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { CloseIcon, PlusIcon } from "@/components/ui/icons";
import { Input, Textarea } from "@/components/ui/input";
import { handleUnauthenticated } from "@/lib/api-client";
import {
  MAX_GROUP_DESCRIPTION_LENGTH,
  MAX_GROUP_NAME_LENGTH,
} from "@/lib/constraints";

/** Delay of each block as the dialog fills in, so it settles top to bottom. */
function enter(index: number) {
  return { "--delay": `${120 + index * 60}ms` } as CSSProperties;
}

/** Modal that creates a group. Mount it to open it; closing discards what was typed. */
export function CreateGroupDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  // A drag that starts in a field and ends over the backdrop reports the
  // dialog as the click target, so only close on a full backdrop tap.
  const pressedBackdrop = useRef(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // showModal() restores focus to the opener when the dialog closes.
    ref.current?.showModal();
    nameInputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description.trim() || undefined,
        }),
      });
      if (handleUnauthenticated(res)) return;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo crear el grupo");
        return;
      }
      onCreated();
    } catch {
      setError("No se pudo crear el grupo. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  const trimmedName = name.trim();

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the backdrop tap is a pointer shortcut; Escape already closes via onClose
    <dialog
      ref={ref}
      aria-labelledby="create-group-title"
      onClose={onClose}
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedBackdrop.current) onClose();
      }}
      className="animate-dialog-pop m-auto w-[min(460px,calc(100vw-32px))] overflow-hidden rounded-3xl border border-line bg-raised p-0 text-ink shadow-2xl shadow-black/25 backdrop:animate-backdrop-in backdrop:bg-black/55 backdrop:backdrop-blur-[2px] max-sm:mt-[10dvh] max-sm:mb-auto"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span
              aria-hidden="true"
              className="animate-dot-pop flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent"
              style={{ "--delay": "140ms" } as CSSProperties}
            >
              <PlusIcon className="size-5" />
            </span>
            <div className="animate-rise" style={enter(0)}>
              <h2
                id="create-group-title"
                className="text-section font-semibold"
              >
                Nuevo grupo
              </h2>
              <p className="text-meta text-muted">
                Reúne las tareas de un mismo objetivo.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="-mt-1 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="animate-rise" style={enter(1)}>
          <Field
            label="Nombre"
            hint={`${name.length}/${MAX_GROUP_NAME_LENGTH}`}
          >
            <Input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_GROUP_NAME_LENGTH}
              placeholder="Ej. Lanzamiento de la web"
              autoComplete="off"
              className="h-11 w-full"
            />
          </Field>
        </div>

        <div className="animate-rise" style={enter(2)}>
          <Field
            label="Descripción (opcional)"
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
        </div>

        {/* The card as it will look in the grid, following what is typed. */}
        <div
          aria-hidden="true"
          className="animate-rise flex flex-col gap-3 rounded-panel border border-line bg-sunken/60 p-3.5"
          style={enter(3)}
        >
          <div className="min-w-0">
            <p
              className={`truncate font-semibold transition-colors ${trimmedName ? "text-ink" : "text-muted"}`}
            >
              {trimmedName || "Nombre del grupo"}
            </p>
            <p className="line-clamp-1 text-meta text-muted">
              {description.trim() || "Sin descripción"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-meta text-muted">
              <span>Sin tareas</span>
              <span className="tabular font-medium">0%</span>
            </div>
            <span className="h-0.75 rounded-full bg-line" />
          </div>
        </div>

        <FormError message={error} />

        <div className="animate-rise flex justify-end gap-2" style={enter(4)}>
          <Button variant="ghost" onClick={onClose} className="h-10">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={pending || !trimmedName}
            className="h-10 px-5"
          >
            {pending ? "Creando…" : "Crear grupo"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
