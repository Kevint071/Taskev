"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_GROUP_NAME_LENGTH } from "@/lib/constraints";

/** Inline form that creates a group; closing it discards what was typed. */
export function CreateGroupForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear el grupo");
      return;
    }
    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          onClose();
        }
      }}
      className="animate-reveal flex flex-col gap-2"
    >
      <div className="flex gap-4">
        <div className="relative min-w-0 flex-1">
          <Input
            ref={nameInputRef}
            type="text"
            aria-label="Nombre del nuevo grupo"
            placeholder="Nombre del nuevo grupo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_GROUP_NAME_LENGTH}
            className="w-full pr-20"
          />
          <span className="tabular pointer-events-none absolute inset-y-0 right-3 flex items-center text-meta text-muted">
            {name.length}/{MAX_GROUP_NAME_LENGTH}
          </span>
        </div>
        <Button type="submit" variant="primary">
          Crear
        </Button>
      </div>
      <FormError message={error} />
    </form>
  );
}
