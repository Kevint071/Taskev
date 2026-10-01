import { type FormEvent, useState } from "react";
import type { Provider } from "@/lib/ai/provider";
import { KEY_PROVIDERS, type KeyStatus } from "./key-providers";

/** One provider's stored key: its status and the save/delete requests. */
export function useApiKey(
  provider: Provider,
  initialStatus: KeyStatus,
  onSaved: () => void,
) {
  const { endpoint } = KEY_PROVIDERS[provider];
  const [status, setStatus] = useState(initialStatus);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /** Opens the editor on an empty field, forgetting the last outcome. */
  function startEditing() {
    setApiKey("");
    setError(null);
    setSaved(null);
  }

  function cancel() {
    setApiKey("");
    setError(null);
  }

  function changeKey(value: string) {
    setApiKey(value);
    setError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    setPending(true);
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar la API key");
      return;
    }
    const replaced = status.configured;
    setStatus({ configured: true, last4: data.last4 });
    setApiKey("");
    setSaved(replaced ? "API key reemplazada" : "API key guardada");
    onSaved();
  }

  async function remove() {
    setDeleting(true);
    setError(null);
    setSaved(null);
    const res = await fetch(endpoint, { method: "DELETE" });
    setDeleting(false);
    setConfirmOpen(false);
    if (!res.ok) {
      setError("No se pudo eliminar la API key");
      return;
    }
    setStatus({ configured: false });
    setSaved("API key eliminada");
  }

  return {
    status,
    apiKey,
    error,
    saved,
    pending,
    deleting,
    confirmOpen,
    setConfirmOpen,
    startEditing,
    cancel,
    changeKey,
    submit,
    remove,
  };
}
