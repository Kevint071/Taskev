import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { type FormEvent, useState } from "react";
import { MAX_NAME_LENGTH } from "@/lib/constraints";

/** The display-name form: draft, validation and saving to the account. */
export function useProfileForm(initialName: string | null) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(initialName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const trimmed = name.trim();

  async function submit(e: FormEvent) {
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

  return {
    name,
    trimmed,
    error,
    saved,
    pending,
    tooLong: trimmed.length > MAX_NAME_LENGTH,
    unchanged: trimmed === (initialName ?? ""),
    edit: (next: string) => {
      setName(next);
      setSaved(null);
    },
    discard: () => {
      setName(initialName ?? "");
      setError(null);
    },
    submit,
  };
}
