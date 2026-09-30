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
  FlagIcon,
  HistoryIcon,
  NewChatIcon,
  NoteIcon,
  PanelRightIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
  StopIcon,
  TriangleAlertIcon,
} from "@/components/ui/icons";
import { LoadingRows } from "@/components/ui/panel";
import type { DisplayItem, PendingAction } from "@/lib/ai/agent";
import {
  matchCommands,
  parseCommand,
  type SlashCommand,
} from "@/lib/ai/commands";
import { pickProvider } from "@/lib/ai/conversations";
import { defaultModel, type ModelOption, modelsFor } from "@/lib/ai/models";
import { PROVIDER_NAMES, type Provider } from "@/lib/ai/provider";
import { handleUnauthenticated } from "@/lib/api-client";
import type { TranscriptItem } from "@/lib/db/schema";
import { settingsHref } from "@/lib/settings-tabs";
import { type ConversationItem, ConversationList } from "./conversation-list";
import { OptionPicker } from "./option-picker";
import { TypedMarkdown } from "./typed-markdown";

type ChatItem =
  | { kind: "user"; text: string }
  // `typing`: a reply that just arrived is typed out; loaded ones show whole.
  | { kind: "assistant"; text: string; typing?: boolean }
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

const COMMAND_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  crear: PlusIcon,
  comentar: NoteIcon,
  bloqueadas: FlagIcon,
  vencen: CalendarIcon,
  hoy: CheckIcon,
  priorizar: SparklesIcon,
};

/** Remembers, per browser, whether the desktop conversation panel is folded. */
const PANEL_STORAGE_KEY = "taskev.assistant.panelCollapsed";
/** Remembers, per browser, the model last picked under each provider. */
const MODELS_STORAGE_KEY = "taskev.assistant.models";

/** Copilot's models depend on the user's plan, so they're fetched once. */
type CopilotModels =
  | { status: "idle" | "loading" | "error"; options: ModelOption[] }
  | { status: "ready"; options: ModelOption[] };

function initialModels(): Record<Provider, string> {
  return {
    gemini: defaultModel("gemini"),
    groq: defaultModel("groq"),
    openrouter: defaultModel("openrouter"),
    copilot: defaultModel("copilot"),
  };
}

/** Codes after which the fix is in Settings, so the error links there. */
const KEY_ERRORS = new Set(["invalid_key", "no_key"]);

/** Markdown symbols would be read out loud, so they are dropped. */
function spoken(text: string) {
  return text.replace(/[*_`#>|]+/g, "").trim();
}

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
  // A conversation in the URL starts as loading, so the first paint shows the
  // skeleton instead of flashing the empty-chat welcome before the effect runs.
  const [activeId, setActiveId] = useState<string | null>(urlId);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [provider, setProvider] = useState<Provider>(
    () =>
      pickProvider([initialConversations[0]?.provider], providers) ??
      providers[0],
  );
  // Each provider keeps its own model, so one model id offered by two
  // providers is never mixed up between them.
  const [models, setModels] = useState(initialModels);
  const [copilotModels, setCopilotModels] = useState<CopilotModels>({
    status: "idle",
    options: [],
  });
  const [draft, setDraft] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  // Escape closes the command menu until the draft changes again.
  const [menuDismissed, setMenuDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  // What screen readers are told about a fresh reply. Only new replies are
  // announced: opening a saved conversation must not read its whole history.
  const [announcement, setAnnouncement] = useState("");
  const [loading, setLoading] = useState(urlId !== null);
  const [listOpen, setListOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [toDelete, setToDelete] = useState<ConversationItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Bumped whenever the open conversation changes, so a reply or a load
  // still in flight for the previous one is dropped.
  const generation = useRef(0);
  // The conversation whose content is on screen (or being loaded).
  const shownId = useRef<string | null>(null);
  // The request in flight, so the stop button can abandon it.
  const inFlight = useRef<AbortController | null>(null);
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

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(MODELS_STORAGE_KEY) ?? "{}",
      );
      if (typeof saved !== "object" || saved === null) return;
      setModels((current) => {
        const next = { ...current };
        for (const p of Object.keys(current) as Provider[]) {
          if (typeof saved[p] === "string") next[p] = saved[p];
        }
        return next;
      });
    } catch {
      // Storage can be blocked or hold junk; each provider then starts on its default.
    }
  }, []);

  const usesCopilot = providers.includes("copilot");
  const copilotStatus = copilotModels.status;
  useEffect(() => {
    if (provider !== "copilot" || !usesCopilot || copilotStatus !== "idle") {
      return;
    }
    setCopilotModels({ status: "loading", options: [] });
    fetch("/api/assistant/models")
      .then(async (res) => {
        if (handleUnauthenticated(res)) return;
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data.models)) throw new Error();
        const options = data.models as ModelOption[];
        setCopilotModels({ status: "ready", options });
        // A remembered model the plan no longer offers gives way to the first one.
        setModels((current) =>
          options.length > 0 && !options.some((m) => m.id === current.copilot)
            ? { ...current, copilot: options[0].id }
            : current,
        );
      })
      .catch(() => setCopilotModels({ status: "error", options: [] }));
  }, [provider, usesCopilot, copilotStatus]);

  function pickModel(next: string) {
    const updated = { ...models, [provider]: next };
    setModels(updated);
    try {
      localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage can be blocked (private mode); the choice lasts for this visit.
    }
  }

  function togglePanel() {
    const next = !panelCollapsed;
    setPanelCollapsed(next);
    try {
      localStorage.setItem(PANEL_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Storage can be blocked (private mode); the choice lasts for this visit.
    }
  }

  function keepEndInView() {
    // Instant: a smooth scroll would still be chasing the previous frame.
    endRef.current?.scrollIntoView({ block: "end", behavior: "instant" });
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
    setAnnouncement("");
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
    setAnnouncement("");
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
    const controller = new AbortController();
    inFlight.current = controller;
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: shownId.current,
          ...("message" in body ? { provider } : {}),
          // While an action awaits confirmation the provider is locked, so
          // this is also the model that continues that conversation.
          model: models[provider],
          // Copilot models speak different APIs, which the picker's catalog told.
          ...(provider === "copilot"
            ? {
                modelApi: copilotModels.options.find(
                  (m) => m.id === models.copilot,
                )?.api,
              }
            : {}),
          ...body,
        }),
      });
      if (handleUnauthenticated(res)) return;
      const data = await res.json().catch(() => ({}));
      if (token !== generation.current || controller.signal.aborted) return;
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
      setAnnouncement(
        [
          ...reply.display.map((item) => spoken(item.text)),
          reply.pending
            ? `Pendiente de confirmación: ${reply.pending.summary}`
            : "",
        ]
          .filter(Boolean)
          .join(". "),
      );
      const fresh = reply.display.map(toChatItem);
      // Only the last text of the reply is typed out; earlier ones are already there.
      const lastText = fresh.map((item) => item.kind).lastIndexOf("assistant");
      setItems((prev) => [
        ...prev,
        ...fresh.map((item, i) =>
          i === lastText ? { ...item, typing: true } : item,
        ),
      ]);
    } catch {
      // A stopped request is not an error; stop() already updated the screen.
      if (token !== generation.current || controller.signal.aborted) return;
      setItems((prev) => [
        ...prev,
        errorItem(
          "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.",
        ),
      ]);
    } finally {
      // Once stopped, a newer request may own the busy flag.
      if (token === generation.current && inFlight.current === controller) {
        inFlight.current = null;
        setBusy(false);
      }
    }
  }

  function stop() {
    if (!inFlight.current) return;
    inFlight.current.abort();
    inFlight.current = null;
    setBusy(false);
    setItems((prev) => [
      ...prev,
      { kind: "action", text: "Respuesta detenida", isError: false },
    ]);
    inputRef.current?.focus();
  }

  function changeDraft(text: string) {
    setDraft(text);
    setCommandIndex(0);
    setMenuDismissed(false);
  }

  function pickCommand(command: SlashCommand) {
    if (command.needsArgs) {
      changeDraft(`/${command.name} `);
      inputRef.current?.focus();
      return;
    }
    send(`/${command.name}`);
  }

  function send(text: string) {
    const message = text.trim();
    if (!message || busy || loading) return;
    // A command that needs text has nothing to work on yet: keep typing.
    const command = parseCommand(message);
    if (command?.command.needsArgs && !command.args) {
      changeDraft(`/${command.command.name} `);
      inputRef.current?.focus();
      return;
    }
    changeDraft("");
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
    changeDraft(suggestion.prompt);
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
    if (menuOpen && !event.nativeEvent.isComposing) {
      const last = commands.length - 1;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setCommandIndex((i) =>
          i + step < 0 ? last : i + step > last ? 0 : i + step,
        );
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        pickCommand(commands[Math.min(commandIndex, last)]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuDismissed(true);
        return;
      }
    }
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      send(draft);
    }
  }

  const lastUser = items.map((item) => item.kind).lastIndexOf("user");
  const commands = matchCommands(draft);
  const menuOpen = commands.length > 0 && !menuDismissed;
  const activeCommand = commands[Math.min(commandIndex, commands.length - 1)];
  const empty = items.length === 0 && !busy && !loading;
  const canPickProvider = providers.length > 1;
  const modelOptions =
    modelsFor(provider) ??
    (provider === "copilot" ? copilotModels.options : []);
  const modelsLoading =
    provider === "copilot" &&
    (copilotModels.status === "idle" || copilotModels.status === "loading");
  const modelLabel =
    modelOptions.find((m) => m.id === models[provider])?.label ??
    models[provider];
  const providerLocked = busy || pending !== null;
  const providerLockedTitle = pending
    ? "Confirma o cancela la acción pendiente para cambiar de proveedor"
    : undefined;
  const panelToggleLabel = panelCollapsed
    ? "Mostrar conversaciones"
    : "Ocultar conversaciones";
  const conversationCount =
    conversations.length === 0
      ? "Aún no hay conversaciones"
      : conversations.length === 1
        ? "1 conversación"
        : `${conversations.length} conversaciones`;
  // Rendered twice (below/above the input, and beside the send button), one of
  // them hidden by CSS at each breakpoint.
  const modelControl = (align: "left" | "right") =>
    modelOptions.length > 1 ? (
      <OptionPicker
        label="Modelo"
        value={models[provider]}
        options={modelOptions}
        onChange={pickModel}
        disabled={providerLocked}
        title={
          pending
            ? "Confirma o cancela la acción pendiente para cambiar de modelo"
            : undefined
        }
        opensUp
        align={align}
        sizeToValue
        triggerClassName="h-9 max-w-full gap-1! border-transparent bg-transparent px-1 hover:text-accent focus-visible:border-accent lg:h-10"
      />
    ) : (
      <span className="inline-flex h-9 max-w-full items-center px-1 text-meta font-medium text-muted lg:h-10">
        <span className="truncate">
          {modelsLoading
            ? "Cargando modelos…"
            : copilotModels.status === "error" && provider === "copilot"
              ? "No se pudieron cargar los modelos"
              : modelLabel}
        </span>
      </span>
    );
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
      <div className="mx-auto flex w-full max-w-220 min-w-0 flex-1 flex-col">
        <h1 className="sr-only">Asistente</h1>
        <div className="flex items-center gap-2 px-4 pt-3 md:px-10 lg:pt-4">
          <button
            type="button"
            onClick={() => setListOpen(true)}
            aria-label={`Historial, ${conversationCount}`}
            title={`Historial · ${conversationCount}`}
            className="flex size-13 shrink-0 items-center justify-center rounded-2xl border border-line bg-raised text-accent shadow-panel transition-colors hover:border-accent/40 lg:hidden"
          >
            <HistoryIcon className="size-5" />
          </button>
          {canPickProvider ? (
            <OptionPicker
              label="Proveedor"
              value={provider}
              options={providers.map((p) => ({
                id: p,
                label: PROVIDER_NAMES[p],
              }))}
              onChange={(next) => setProvider(next as Provider)}
              disabled={providerLocked}
              title={providerLockedTitle}
              className="ml-auto"
              sizeToValue
              triggerClassName="h-11 border-line-strong bg-raised pr-2.5 pl-3.5 shadow-panel hover:border-ink/30 focus-visible:border-accent lg:h-9 lg:pl-3"
            />
          ) : (
            <span className="ml-auto inline-flex h-11 items-center rounded-full bg-sunken px-3 text-meta font-medium text-muted lg:h-9">
              {PROVIDER_NAMES[provider]}
            </span>
          )}
          <Button
            variant="primary"
            onClick={startNew}
            aria-label="Nueva conversación"
            title="Nueva conversación"
            className="size-13 rounded-2xl px-0 lg:hidden"
          >
            <NewChatIcon className="size-6" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 md:px-10 md:pt-10">
          <section
            aria-label="Conversación"
            className="flex min-h-full flex-col gap-3 pb-4"
          >
            <div aria-live="polite" className="sr-only">
              {announcement}
            </div>
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
                          <suggestion.icon className="size-4.5" />
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
                // Once the user writes again, whatever was still typing shows whole.
                typing={
                  item.kind === "assistant" && !!item.typing && i > lastUser
                }
                onTyping={keepEndInView}
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
              <output className="flex items-center gap-2 self-start text-muted">
                <span className="flex gap-1" aria-hidden="true">
                  <span className="size-1.5 animate-pulse rounded-full bg-muted" />
                  <span className="size-1.5 animate-pulse rounded-full bg-muted [animation-delay:150ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-muted [animation-delay:300ms]" />
                </span>
                Pensando…
              </output>
            ) : null}
            <div ref={endRef} />
          </section>
        </div>

        <div className="flex flex-col px-4 pt-2 pb-4 md:px-10 md:pb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="relative flex flex-col gap-1 rounded-[31px] border border-line-strong bg-raised p-2 shadow-[0_8px_30px_-12px_rgba(26,35,50,0.25)] transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_16%,transparent),0_8px_30px_-12px_rgba(26,35,50,0.25)]"
          >
            {menuOpen ? (
              <div
                id="assistant-commands"
                role="listbox"
                aria-label="Comandos"
                className="animate-reveal absolute inset-x-0 bottom-full z-10 mb-2 flex flex-col gap-0.5 rounded-2xl border border-line bg-raised p-1.5 shadow-panel"
              >
                {commands.map((command, i) => {
                  const Icon = COMMAND_ICONS[command.name] ?? SparklesIcon;
                  const active = command === activeCommand;
                  return (
                    // biome-ignore lint/a11y/useKeyWithClickEvents: the textarea drives the listbox with the keyboard (aria-activedescendant)
                    <div
                      key={command.name}
                      id={`assistant-command-${command.name}`}
                      role="option"
                      aria-selected={active}
                      tabIndex={-1}
                      // Keeps the textarea focused while the option is clicked.
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setCommandIndex(i)}
                      onClick={() => pickCommand(command)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 ${
                        active ? "bg-accent-soft" : ""
                      }`}
                    >
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          active
                            ? "bg-accent text-accent-ink"
                            : "bg-accent-soft text-accent"
                        }`}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink">
                          /{command.name}
                          <span className="ml-2 font-normal text-muted">
                            {command.title}
                          </span>
                        </span>
                        <span className="block truncate text-meta text-muted">
                          {command.hint}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
            <label htmlFor="assistant-input" className="sr-only">
              Mensaje para el asistente
            </label>
            {/* Centered while the (possibly wrapped) placeholder shows; pinned to
                the last line once there is text to grow. */}
            <div
              className={`flex gap-2 ${draft === "" ? "items-center" : "items-end"}`}
            >
              <textarea
                id="assistant-input"
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => changeDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-expanded={menuOpen}
                aria-controls="assistant-commands"
                aria-autocomplete="list"
                aria-activedescendant={
                  menuOpen && activeCommand
                    ? `assistant-command-${activeCommand.name}`
                    : undefined
                }
                placeholder="Pregunta o escribe / para ver comandos…"
                maxLength={4000}
                className="field-sizing-content max-h-48 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-ink outline-none placeholder:text-muted"
              />
              {/* From lg up the model sits beside the send button. */}
              <div className="hidden shrink-0 lg:block">
                {modelControl("right")}
              </div>
              {/* Send and stop are separate elements, so a click that starts a
                  request never lands on a button that has already changed role. */}
              {busy ? (
                <Button
                  key="stop"
                  type="button"
                  variant="primary"
                  onClick={stop}
                  aria-label="Detener"
                  title="Detener"
                  className="size-10! shrink-0 rounded-full px-0"
                >
                  <StopIcon />
                </Button>
              ) : (
                <Button
                  key="send"
                  type="submit"
                  variant="primary"
                  disabled={loading || draft.trim() === ""}
                  aria-label="Enviar"
                  className="size-10! shrink-0 rounded-full px-0 transition-[background-color,opacity,transform] enabled:hover:scale-105 disabled:bg-accent/60 disabled:text-accent-ink/80 disabled:opacity-100"
                >
                  <SendIcon />
                </Button>
              )}
            </div>
          </form>
          {/* Above the input on mobile, below it on md; from lg the model sits
              beside the send button, so only the counter stays in this row. */}
          <div
            className={`order-first mb-1 flex items-center gap-2 px-3 md:order-0 md:mt-1 md:mb-0 ${
              draft.length > 3500 ? "" : "lg:hidden"
            }`}
          >
            <div className="min-w-0 shrink lg:hidden">
              {modelControl("left")}
            </div>
            {draft.length > 3500 ? (
              <p className="ml-auto shrink-0 pr-2 text-meta text-muted">
                {draft.length}/4000
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <aside
        aria-label="Conversaciones"
        className={`hidden shrink-0 flex-col gap-3 border-l border-line bg-raised/40 py-4 transition-[width] duration-200 lg:flex ${
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
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.6875rem] leading-none font-semibold text-accent-ink">
                  {conversations.length > 99 ? "99+" : conversations.length}
                </span>
              ) : null}
            </Button>
            <Button
              onClick={startNew}
              aria-label="Nueva conversación"
              title="Nueva conversación"
              className="size-10 rounded-xl border-line bg-transparent px-0 text-accent hover:border-accent/40 hover:bg-accent-soft"
            >
              <NewChatIcon className="size-5" />
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 pl-2">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-ui font-semibold">
                  Conversaciones
                </h2>
                <p className="text-meta text-muted">{conversationCount}</p>
              </div>
              <Button
                variant="ghost"
                onClick={togglePanel}
                aria-expanded
                aria-label={panelToggleLabel}
                title={panelToggleLabel}
                className="size-8 rounded-lg px-0"
              >
                <PanelRightIcon className="size-4.5" />
              </Button>
            </div>
            <Button
              onClick={startNew}
              className="h-10 justify-start gap-2.5 rounded-xl border-line bg-transparent px-3 text-ink hover:border-accent/40 hover:bg-accent-soft"
            >
              <NewChatIcon className="size-4 text-accent" />
              Nueva conversación
            </Button>
            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-2">
              {list}
            </div>
          </>
        )}
      </aside>

      <BottomSheet
        open={listOpen}
        title="Historial"
        showClose={false}
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

function ChatRow({
  item,
  typing,
  onTyping,
  onReload,
}: {
  item: ChatItem;
  typing: boolean;
  onTyping: () => void;
  onReload: () => void;
}) {
  switch (item.kind) {
    case "user":
      return (
        <p className="chat-bubble-user max-w-[85%] self-end rounded-2xl rounded-br-md px-4 py-2.5 whitespace-pre-wrap shadow-panel wrap-break-word">
          {item.text}
        </p>
      );
    case "assistant":
      return (
        <div className="chat-bubble-bot max-w-[85%] space-y-2 self-start rounded-2xl rounded-bl-md px-4 py-2.5 wrap-break-word shadow-panel">
          <TypedMarkdown
            text={item.text}
            animate={typing}
            onProgress={onTyping}
          />
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
      className="animate-reveal flex flex-col gap-4 self-stretch rounded-2xl border border-line bg-raised p-4 shadow-panel sm:self-start sm:min-w-90"
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
