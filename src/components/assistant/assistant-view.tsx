"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  type ComponentType,
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  FlagIcon,
  HistoryIcon,
  NewChatIcon,
  NoteIcon,
  PanelRightIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "@/components/ui/icons";
import { Select } from "@/components/ui/input";
import { LoadingRows } from "@/components/ui/panel";
import type { DisplayItem, PendingAction } from "@/lib/ai/agent";
import { pickProvider } from "@/lib/ai/conversations";
import { MODEL_LABELS, type Provider } from "@/lib/ai/provider";
import { handleUnauthenticated } from "@/lib/api-client";
import type { TranscriptItem } from "@/lib/db/schema";
import { settingsHref } from "@/lib/settings-tabs";
import { ChatMarkdown } from "./chat-markdown";
import { type ConversationItem, ConversationList } from "./conversation-list";

type ChatItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "action"; text: string; isError: boolean }
  | { kind: "error"; text: string; settingsLink: boolean; reload: boolean };

type AssistantResponse = {
  conversation: ConversationItem;
  display: DisplayItem[];
  pending: PendingAction | null;
};

type RequestBody =
  | { message: string }
  | { confirmation: { callId: string; approved: boolean } };

const ASSISTANT_PATH = "/asistente";
/** The open conversation lives in the URL, so a reload keeps it. */
const CONVERSATION_PARAM = "c";

type Suggestion = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  prompt: string;
  /** Questions are sent as they are; requests that need details fill the input. */
  send: boolean;
};

const SUGGESTIONS: Suggestion[] = [
  {
    icon: FlagIcon,
    title: "Qué está bloqueado",
    hint: "Tareas detenidas y en qué grupo están",
    prompt: "¿Qué tareas tengo bloqueadas?",
    send: true,
  },
  {
    icon: CalendarIcon,
    title: "Qué vence pronto",
    hint: "Fechas límite de esta semana",
    prompt: "¿Qué vence esta semana?",
    send: true,
  },
  {
    icon: CheckIcon,
    title: "Resumen de hoy",
    hint: "Lo que has avanzado y completado",
    prompt: "¿Qué he hecho hoy?",
    send: true,
  },
  {
    icon: PlusIcon,
    title: "Crear una tarea",
    hint: "Dime el título, el grupo y la fecha",
    prompt: "Crea una tarea llamada ",
    send: false,
  },
  {
    icon: NoteIcon,
    title: "Comentar una tarea",
    hint: "Deja una nota sin abrir la tarea",
    prompt: "Añade un comentario a la tarea ",
    send: false,
  },
  {
    icon: SparklesIcon,
    title: "Qué priorizar",
    hint: "Te propongo por dónde empezar",
    prompt: "¿Por dónde debería empezar hoy? Ten en cuenta fechas y bloqueos.",
    send: true,
  },
];

/** Remembers, per browser, whether the desktop conversation panel is folded. */
const PANEL_STORAGE_KEY = "taskev.assistant.panelCollapsed";

/** Codes after which the fix is in Settings, so the error links there. */
const KEY_ERRORS = new Set(["invalid_key", "no_key"]);

function toChatItem(item: DisplayItem): ChatItem {
  return item.type === "text"
    ? { kind: "assistant", text: item.text }
    : { kind: "action", text: item.text, isError: item.isError };
}

function fromTranscript(item: TranscriptItem): ChatItem {
  return item.kind === "action"
    ? { kind: "action", text: item.text, isError: item.isError === true }
    : { kind: item.kind, text: item.text };
}

function errorItem(
  text: string,
  code?: string,
): Extract<ChatItem, { kind: "error" }> {
  return {
    kind: "error",
    text,
    settingsLink: KEY_ERRORS.has(code ?? ""),
    reload: code === "conflict",
  };
}

function conversationHref(id: string | null) {
  return id
    ? `${ASSISTANT_PATH}?${CONVERSATION_PARAM}=${encodeURIComponent(id)}`
    : ASSISTANT_PATH;
}

/**
 * The chat plus the user's saved conversations. The server keeps each
 * conversation's model context; this view only holds what the user sees.
 */
export function AssistantView({
  providers,
  initialConversations,
}: {
  /** Providers with a configured key, at least one. */
  providers: Provider[];
  initialConversations: ConversationItem[];
}) {
  const searchParams = useSearchParams();
  const urlId = searchParams.get(CONVERSATION_PARAM);

  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [provider, setProvider] = useState<Provider>(
    () =>
      pickProvider([initialConversations[0]?.provider], providers) ??
      providers[0],
  );
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [toDelete, setToDelete] = useState<ConversationItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Bumped whenever the open conversation changes, so a reply or a load
  // still in flight for the previous one is dropped.
  const generation = useRef(0);
  // The conversation whose content is on screen (or being loaded).
  const shownId = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the transcript grows
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [items.length, pending, busy]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: load only when the URL points elsewhere
  useEffect(() => {
    if (urlId === shownId.current) return;
    if (urlId) void load(urlId);
    else clear();
  }, [urlId]);

  useEffect(() => {
    try {
      setPanelCollapsed(localStorage.getItem(PANEL_STORAGE_KEY) === "1");
    } catch {
      // Storage can be blocked (private mode); the panel then starts expanded.
    }
  }, []);

  function togglePanel() {
    const next = !panelCollapsed;
    setPanelCollapsed(next);
    try {
      localStorage.setItem(PANEL_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Storage can be blocked (private mode); the choice lasts for this visit.
    }
  }

  function upsert(conversation: ConversationItem) {
    setConversations((prev) => [
      conversation,
      ...prev.filter((c) => c.id !== conversation.id),
    ]);
  }

  function clear() {
    generation.current++;
    shownId.current = null;
    setActiveId(null);
    setItems([]);
    setPending(null);
    setBusy(false);
    setLoading(false);
    setProvider(
      (current) =>
        pickProvider([conversations[0]?.provider, current], providers) ??
        current,
    );
  }

  async function load(id: string) {
    const token = ++generation.current;
    shownId.current = id;
    setActiveId(id);
    setItems([]);
    setPending(null);
    setBusy(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`);
      if (handleUnauthenticated(res)) return;
      const data = await res.json().catch(() => ({}));
      if (token !== generation.current) return;
      if (!res.ok) {
        // Gone (deleted elsewhere) or never ours: start over from an empty chat.
        shownId.current = null;
        setActiveId(null);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        window.history.replaceState(null, "", ASSISTANT_PATH);
        setItems([
          errorItem(
            res.status === 404
              ? "Esta conversación ya no existe."
              : "No se pudo abrir la conversación.",
          ),
        ]);
        return;
      }
      setItems((data.transcript as TranscriptItem[]).map(fromTranscript));
      setPending(data.pending ?? null);
      setProvider(
        (current) =>
          pickProvider([data.provider, current], providers) ?? current,
      );
    } catch {
      if (token !== generation.current) return;
      setItems([
        errorItem(
          "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.",
        ),
      ]);
    } finally {
      if (token === generation.current) setLoading(false);
    }
  }

  function open(id: string) {
    setListOpen(false);
    window.history.replaceState(null, "", conversationHref(id));
    if (id === shownId.current && !loading) void load(id);
  }

  function startNew() {
    setListOpen(false);
    window.history.replaceState(null, "", ASSISTANT_PATH);
    clear();
    setDraft("");
    inputRef.current?.focus();
  }

  async function request(body: RequestBody) {
    const token = generation.current;
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: shownId.current,
          ...("message" in body ? { provider } : {}),
          ...body,
        }),
      });
      if (handleUnauthenticated(res)) return;
      const data = await res.json().catch(() => ({}));
      if (token !== generation.current) return;
      if (!res.ok) {
        setItems((prev) => [
          ...prev,
          errorItem(data.error ?? "El asistente no pudo responder.", data.code),
        ]);
        return;
      }
      const reply = data as AssistantResponse;
      if (shownId.current === null) {
        // The first message created the conversation.
        shownId.current = reply.conversation.id;
        setActiveId(reply.conversation.id);
        window.history.replaceState(
          null,
          "",
          conversationHref(reply.conversation.id),
        );
      }
      upsert(reply.conversation);
      setPending(reply.pending);
      setItems((prev) => [...prev, ...reply.display.map(toChatItem)]);
    } catch {
      if (token !== generation.current) return;
      setItems((prev) => [
        ...prev,
        errorItem(
          "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.",
        ),
      ]);
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }

  function send(text: string) {
    const message = text.trim();
    if (!message || busy || loading) return;
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

  function pickSuggestion(suggestion: Suggestion) {
    if (suggestion.send) {
      send(suggestion.prompt);
      return;
    }
    setDraft(suggestion.prompt);
    inputRef.current?.focus();
  }

  function resolvePending(approved: boolean) {
    if (!pending || busy) return;
    const { callId } = pending;
    setPending(null);
    request({ confirmation: { callId, approved } });
  }

  async function rename(id: string, title: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (handleUnauthenticated(res)) return null;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? "No se pudo renombrar la conversación";
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: data.title } : c)),
      );
      return null;
    } catch {
      return "No se pudo conectar. Inténtalo de nuevo.";
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const { id } = toDelete;
    setDeleting(true);
    let ok = false;
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`, {
        method: "DELETE",
      });
      if (handleUnauthenticated(res)) return;
      // Already gone counts as deleted.
      ok = res.ok || res.status === 404;
    } catch {
      ok = false;
    }
    setDeleting(false);
    setToDelete(null);
    if (!ok) {
      setItems((prev) => [
        ...prev,
        errorItem("No se pudo eliminar la conversación. Inténtalo de nuevo."),
      ]);
      return;
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === shownId.current) startNew();
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

  const empty = items.length === 0 && !busy && !loading;
  const canPickModel = providers.length > 1;
  const panelToggleLabel = panelCollapsed
    ? "Mostrar conversaciones"
    : "Ocultar conversaciones";
  const conversationCount =
    conversations.length === 0
      ? "Aún no hay conversaciones"
      : conversations.length === 1
        ? "1 conversación"
        : `${conversations.length} conversaciones`;
  const list = (
    <ConversationList
      conversations={conversations}
      activeId={activeId}
      onOpen={open}
      onRename={rename}
      onDelete={setToDelete}
    />
  );

  return (
    <div className="flex min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-[880px] min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 px-4 pt-3 lg:hidden">
          <button
            type="button"
            onClick={() => setListOpen(true)}
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-line bg-raised p-2 pr-3 text-left shadow-panel transition-colors hover:border-accent/40"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <HistoryIcon className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">Historial</span>
              <span className="block truncate text-meta text-muted">
                {conversationCount}
              </span>
            </span>
            <ChevronDownIcon className="size-4 text-muted transition-colors group-hover:text-ink" />
          </button>
          <Button
            variant="primary"
            onClick={startNew}
            aria-label="Nueva conversación"
            title="Nueva conversación"
            className="size-13 rounded-2xl px-0"
          >
            <NewChatIcon className="size-6" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 md:px-10 md:pt-10">
          <section
            aria-label="Conversación"
            aria-live="polite"
            className="flex min-h-full flex-col gap-3 pb-4"
          >
            {loading ? <LoadingRows rows={3} /> : null}

            {empty ? (
              <div className="flex flex-1 flex-col justify-center gap-8 px-4 py-4 md:px-0 md:py-10">
                <div className="flex flex-col items-center gap-4 text-center">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent ring-1 ring-accent/15">
                    <SparklesIcon className="size-7" />
                  </span>
                  <div className="space-y-2">
                    <h2 className="text-headline font-semibold">
                      ¿En qué te ayudo hoy?
                    </h2>
                    <p className="mx-auto max-w-[46ch] text-muted">
                      Consulta tus tareas o pide cambios en lenguaje normal.
                      Borrar o archivar siempre te pedirá confirmación.
                    </p>
                  </div>
                </div>
                <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {SUGGESTIONS.map((suggestion, i) => (
                    <li key={suggestion.title} className="contents">
                      <button
                        type="button"
                        onClick={() => pickSuggestion(suggestion)}
                        style={{ "--delay": `${i * 60}ms` } as CSSProperties}
                        className="group animate-rise flex items-start gap-3 rounded-2xl border border-line bg-raised p-3.5 text-left shadow-panel transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_6px_18px_-8px_color-mix(in_srgb,var(--accent)_35%,transparent)]"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-accent-ink">
                          <suggestion.icon className="size-[18px]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink">
                            {suggestion.title}
                          </span>
                          <span className="mt-0.5 block text-meta text-muted">
                            {suggestion.hint}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {items.map((item, i) => (
              <ChatRow
                // biome-ignore lint/suspicious/noArrayIndexKey: append-only transcript
                key={i}
                item={item}
                onReload={() => activeId && void load(activeId)}
              />
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
        </div>

        <div className="px-4 pt-2 pb-4 md:px-10 md:pb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="flex flex-col gap-1 rounded-3xl border border-line-strong bg-raised p-2 shadow-[0_8px_30px_-12px_rgba(26,35,50,0.25)] transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_16%,transparent),0_8px_30px_-12px_rgba(26,35,50,0.25)]"
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
              placeholder="Pregunta o pide un cambio…"
              maxLength={4000}
              className="field-sizing-content max-h-48 min-h-11 w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-ink outline-none placeholder:text-muted"
            />
            <div className="flex items-center gap-2 pl-1">
              {canPickModel ? (
                <span className="relative inline-flex items-center">
                  <SparklesIcon className="pointer-events-none absolute left-2.5 size-3.5 text-accent" />
                  <label htmlFor="assistant-model" className="sr-only">
                    Modelo
                  </label>
                  <Select
                    id="assistant-model"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as Provider)}
                    disabled={busy || pending !== null}
                    title={
                      pending
                        ? "Confirma o cancela la acción pendiente para cambiar de modelo"
                        : undefined
                    }
                    className="h-8 max-w-[60vw] rounded-full border-transparent bg-sunken pl-8 text-meta font-medium"
                  >
                    {providers.map((p) => (
                      <option key={p} value={p}>
                        {MODEL_LABELS[p]}
                      </option>
                    ))}
                  </Select>
                </span>
              ) : (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-sunken px-2.5 text-meta font-medium text-muted">
                  <SparklesIcon className="size-3.5 text-accent" />
                  {MODEL_LABELS[provider]}
                </span>
              )}
              <p className="hidden min-w-0 flex-1 truncate text-meta text-muted md:block">
                {draft.length > 3500
                  ? `${draft.length}/4000`
                  : "Intro para enviar · Mayús+Intro para nueva línea"}
              </p>
              <Button
                type="submit"
                variant="primary"
                disabled={busy || loading || draft.trim() === ""}
                aria-label="Enviar"
                className="ml-auto size-10 rounded-full px-0 transition-[background-color,opacity,transform] enabled:hover:scale-105 disabled:bg-sunken disabled:text-muted disabled:opacity-100"
              >
                <SendIcon />
              </Button>
            </div>
          </form>
        </div>
      </div>

      <aside
        aria-label="Conversaciones"
        className={`hidden shrink-0 flex-col gap-4 border-l border-line bg-raised/60 py-4 transition-[width] duration-200 lg:flex ${
          panelCollapsed ? "w-16 items-center px-2" : "w-72 px-3"
        }`}
      >
        {panelCollapsed ? (
          <>
            <Button
              variant="ghost"
              onClick={togglePanel}
              aria-expanded={false}
              aria-label={panelToggleLabel}
              title={`${panelToggleLabel} (${conversations.length})`}
              className="relative size-10 rounded-xl px-0"
            >
              <HistoryIcon className="size-5" />
              {conversations.length > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-none font-semibold text-accent-ink">
                  {conversations.length > 99 ? "99+" : conversations.length}
                </span>
              ) : null}
            </Button>
            <Button
              variant="primary"
              onClick={startNew}
              aria-label="Nueva conversación"
              title="Nueva conversación"
              className="size-10 rounded-xl px-0"
            >
              <NewChatIcon className="size-5" />
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5 pl-1">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <HistoryIcon className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold">Conversaciones</h2>
                <p className="text-meta text-muted">{conversationCount}</p>
              </div>
              <Button
                variant="ghost"
                onClick={togglePanel}
                aria-expanded
                aria-label={panelToggleLabel}
                title={panelToggleLabel}
                className="size-9 px-0"
              >
                <PanelRightIcon className="size-5" />
              </Button>
            </div>
            <Button
              variant="primary"
              onClick={startNew}
              className="h-10 justify-center rounded-xl"
            >
              <NewChatIcon className="size-4" />
              Nueva conversación
            </Button>
            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
              {list}
            </div>
          </>
        )}
      </aside>

      <BottomSheet
        open={listOpen}
        title="Historial"
        onClose={() => setListOpen(false)}
      >
        {list}
      </BottomSheet>

      <ConfirmDialog
        open={toDelete !== null}
        title="¿Eliminar esta conversación?"
        description={
          toDelete
            ? `«${toDelete.title}» y todos sus mensajes se borrarán para siempre.`
            : ""
        }
        confirmLabel="Eliminar"
        pending={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

function ChatRow({ item, onReload }: { item: ChatItem; onReload: () => void }) {
  switch (item.kind) {
    case "user":
      return (
        <p className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-accent px-4 py-2.5 whitespace-pre-wrap text-accent-ink">
          {item.text}
        </p>
      );
    case "assistant":
      return (
        <div className="max-w-[85%] space-y-2 self-start rounded-2xl rounded-bl-md border border-line bg-raised px-4 py-2.5 break-words shadow-panel">
          <ChatMarkdown text={item.text} />
        </div>
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
            {item.reload ? (
              <>
                {" "}
                <button
                  type="button"
                  onClick={onReload}
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  Recargar conversación
                </button>
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
