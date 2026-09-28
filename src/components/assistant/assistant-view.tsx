"use client";

import Link from "next/link";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, SendIcon, TriangleAlertIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/panel";
import type { DisplayItem, PendingAction } from "@/lib/ai/agent";
import type { HistoryStep } from "@/lib/ai/provider";
import { handleUnauthenticated } from "@/lib/api-client";
import { settingsHref } from "@/lib/settings-tabs";

type ChatItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "action"; text: string; isError: boolean }
  | { kind: "error"; text: string; settingsLink: boolean };

type AssistantResponse = {
  history: HistoryStep[];
  display: DisplayItem[];
  pending: PendingAction | null;
};

type RequestBody =
  | { message: string }
  | { confirmation: { callId: string; approved: boolean } };

const SUGGESTIONS = [
  "¿Qué tareas tengo bloqueadas?",
  "¿Qué vence esta semana?",
  "¿Qué he hecho hoy?",
];

/** Codes after which the fix is in Settings, so the error links there. */
const KEY_ERRORS = new Set(["invalid_key", "no_key"]);

function toChatItem(item: DisplayItem): ChatItem {
  return item.type === "text"
    ? { kind: "assistant", text: item.text }
    : { kind: "action", text: item.text, isError: item.isError };
}

/**
 * The conversation lives only in this component's state: reloading or
 * leaving the page starts over, and nothing is stored on the server.
 */
export function AssistantView() {
  const [history, setHistory] = useState<HistoryStep[]>([]);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  // Bumped by "Nueva conversación" so a reply still in flight is dropped.
  const conversation = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the transcript grows
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [items.length, pending, busy]);

  async function request(body: RequestBody) {
    const id = conversation.current;
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, ...body }),
      });
      if (handleUnauthenticated(res)) return;
      const data = await res.json().catch(() => ({}));
      if (id !== conversation.current) return;
      if (!res.ok) {
        setItems((prev) => [
          ...prev,
          {
            kind: "error",
            text: data.error ?? "El asistente no pudo responder.",
            settingsLink: KEY_ERRORS.has(data.code),
          },
        ]);
        return;
      }
      const reply = data as AssistantResponse;
      setHistory(reply.history);
      setPending(reply.pending);
      setItems((prev) => [...prev, ...reply.display.map(toChatItem)]);
    } catch {
      if (id !== conversation.current) return;
      setItems((prev) => [
        ...prev,
        {
          kind: "error",
          text: "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.",
          settingsLink: false,
        },
      ]);
    } finally {
      if (id === conversation.current) setBusy(false);
    }
  }

  function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setDraft("");
    setItems((prev) => [
      ...prev,
      // A new message declines whatever was waiting for confirmation; the
      // server records it the same way.
      ...(pending
        ? [
            {
              kind: "action" as const,
              text: `Sin confirmar: ${pending.summary}`,
              isError: false,
            },
          ]
        : []),
      { kind: "user", text: message },
    ]);
    setPending(null);
    request({ message });
  }

  function resolvePending(approved: boolean) {
    if (!pending || busy) return;
    const { callId } = pending;
    setPending(null);
    request({ confirmation: { callId, approved } });
  }

  function reset() {
    conversation.current++;
    setHistory([]);
    setItems([]);
    setPending(null);
    setDraft("");
    setBusy(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      send(draft);
    }
  }

  const empty = items.length === 0 && !busy;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        title="Asistente"
        description="Consulta y gestiona tus grupos y tareas conversando."
        actions={
          items.length > 0 ? (
            <Button onClick={reset}>Nueva conversación</Button>
          ) : null
        }
      />

      <section
        aria-label="Conversación"
        aria-live="polite"
        className="flex flex-1 flex-col gap-3"
      >
        {empty ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line-strong px-5 py-6">
            <p className="text-muted">
              Pregunta por tus tareas o pide cambios: crear, editar, cambiar de
              estado, comentar… Borrar o archivar siempre te pedirá
              confirmación.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="rounded-full border border-line bg-raised px-3 py-1.5 text-meta font-medium text-ink transition-colors hover:border-line-strong hover:bg-sunken"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {items.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: append-only transcript
          <ChatRow key={i} item={item} />
        ))}

        {pending ? (
          <PendingCard
            action={pending}
            disabled={busy}
            onConfirm={() => resolvePending(true)}
            onCancel={() => resolvePending(false)}
          />
        ) : null}

        {busy ? (
          <p className="flex items-center gap-2 self-start text-muted">
            <span className="flex gap-1" aria-hidden="true">
              <span className="size-1.5 animate-pulse rounded-full bg-muted" />
              <span className="size-1.5 animate-pulse rounded-full bg-muted [animation-delay:150ms]" />
              <span className="size-1.5 animate-pulse rounded-full bg-muted [animation-delay:300ms]" />
            </span>
            Pensando…
          </p>
        ) : null}
        <div ref={endRef} />
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] flex items-end gap-2 rounded-2xl border border-line bg-raised p-2 shadow-panel md:bottom-6"
      >
        <label htmlFor="assistant-input" className="sr-only">
          Mensaje para el asistente
        </label>
        <textarea
          id="assistant-input"
          ref={inputRef}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje…"
          maxLength={4000}
          className="field-sizing-content max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-ink outline-none placeholder:text-muted"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={busy || draft.trim() === ""}
          aria-label="Enviar"
          className="size-10 px-0"
        >
          <SendIcon />
        </Button>
      </form>
    </div>
  );
}

function ChatRow({ item }: { item: ChatItem }) {
  switch (item.kind) {
    case "user":
      return (
        <p className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-accent px-4 py-2.5 whitespace-pre-wrap text-accent-ink">
          {item.text}
        </p>
      );
    case "assistant":
      return (
        <p className="max-w-[85%] self-start rounded-2xl rounded-bl-md border border-line bg-raised px-4 py-2.5 whitespace-pre-wrap shadow-panel">
          {item.text}
        </p>
      );
    case "action":
      return (
        <p
          className={`flex items-center gap-2 self-start text-meta font-medium ${
            item.isError ? "text-danger" : "text-muted"
          }`}
        >
          <span
            className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
              item.isError ? "bg-danger/10" : "bg-status-done text-raised"
            }`}
          >
            {item.isError ? (
              <TriangleAlertIcon className="size-3" />
            ) : (
              <CheckIcon className="size-3" />
            )}
          </span>
          {item.text}
        </p>
      );
    case "error":
      return (
        <div
          role="alert"
          className="flex max-w-[85%] items-start gap-2.5 self-start rounded-2xl border border-danger/30 bg-danger/5 px-4 py-2.5"
        >
          <TriangleAlertIcon className="mt-0.5 size-4 text-danger" />
          <p className="min-w-0 text-ink">
            {item.text}
            {item.settingsLink ? (
              <>
                {" "}
                <Link
                  href={settingsHref("asistente")}
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  Ir a Ajustes
                </Link>
              </>
            ) : null}
          </p>
        </div>
      );
  }
}

/** Same tones as ConfirmDialog: red to delete, amber to (un)archive. */
function PendingCard({
  action,
  disabled,
  onConfirm,
  onCancel,
}: {
  action: PendingAction;
  disabled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const destructive = action.name.startsWith("delete_");
  return (
    <section
      aria-label="Acción pendiente de confirmación"
      className="animate-reveal flex flex-col gap-4 self-stretch rounded-2xl border border-line bg-raised p-4 shadow-panel sm:self-start sm:min-w-[360px]"
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
            destructive
              ? "bg-danger/10 text-danger"
              : "bg-[color-mix(in_srgb,var(--status-paused)_16%,var(--raised))] text-status-paused"
          }`}
        >
          <TriangleAlertIcon className="size-4" />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="font-semibold">{action.summary}</p>
          <p className="mt-0.5 text-meta text-muted">
            {destructive
              ? "No se puede deshacer. ¿Lo confirmas?"
              : "El asistente necesita tu confirmación."}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button disabled={disabled} onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant={destructive ? "danger-solid" : "primary"}
          disabled={disabled}
          onClick={onConfirm}
        >
          Confirmar
        </Button>
      </div>
    </section>
  );
}
