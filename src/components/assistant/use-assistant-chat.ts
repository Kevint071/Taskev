import { useSearchParams } from "next/navigation";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import type { DisplayItem, PendingAction } from "@/lib/ai/agent";
import { pickProvider } from "@/lib/ai/conversations";
import type { ModelApi, Provider } from "@/lib/ai/provider";
import { handleUnauthenticated } from "@/lib/api-client";
import type { TranscriptItem } from "@/lib/db/schema";
import {
  type ChatItem,
  errorItem,
  fromTranscript,
  spoken,
  toChatItem,
} from "./chat-items";
import type { ConversationItem } from "./conversation-list";

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

const CONNECTION_ERROR =
  "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.";

function conversationHref(id: string | null) {
  return id
    ? `${ASSISTANT_PATH}?${CONVERSATION_PARAM}=${encodeURIComponent(id)}`
    : ASSISTANT_PATH;
}

/**
 * The open conversation: what the user sees, the request in flight and the
 * URL that keeps it. The server holds each conversation's model context.
 */
export function useAssistantChat({
  providers,
  conversations,
  provider,
  setProvider,
  model,
  modelApi,
  upsertConversation,
  removeConversation,
}: {
  providers: Provider[];
  conversations: ConversationItem[];
  provider: Provider;
  setProvider: Dispatch<SetStateAction<Provider>>;
  model: string;
  modelApi: ModelApi | undefined;
  upsertConversation: (conversation: ConversationItem) => void;
  removeConversation: (id: string) => void;
}) {
  const searchParams = useSearchParams();
  const urlId = searchParams.get(CONVERSATION_PARAM);

  // A conversation in the URL starts as loading, so the first paint shows the
  // skeleton instead of flashing the empty-chat welcome before the effect runs.
  const [activeId, setActiveId] = useState<string | null>(urlId);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  // What screen readers are told about a fresh reply. Only new replies are
  // announced: opening a saved conversation must not read its whole history.
  const [announcement, setAnnouncement] = useState("");
  const [loading, setLoading] = useState(urlId !== null);
  // Bumped whenever the open conversation changes, so a reply or a load
  // still in flight for the previous one is dropped.
  const generation = useRef(0);
  // The conversation whose content is on screen (or being loaded).
  const shownId = useRef<string | null>(null);
  // The request in flight, so the stop button can abandon it.
  const inFlight = useRef<AbortController | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: load only when the URL points elsewhere
  useEffect(() => {
    if (urlId === shownId.current) return;
    if (urlId) void load(urlId);
    else clear();
  }, [urlId]);

  function showError(text: string) {
    setItems((prev) => [...prev, errorItem(text)]);
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
        removeConversation(id);
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
      setItems([errorItem(CONNECTION_ERROR)]);
    } finally {
      if (token === generation.current) setLoading(false);
    }
  }

  function open(id: string) {
    window.history.replaceState(null, "", conversationHref(id));
    if (id === shownId.current && !loading) void load(id);
  }

  function startNew() {
    window.history.replaceState(null, "", ASSISTANT_PATH);
    clear();
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
          model,
          ...(provider === "copilot" ? { modelApi } : {}),
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
      upsertConversation(reply.conversation);
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
      showError(CONNECTION_ERROR);
    } finally {
      // Once stopped, a newer request may own the busy flag.
      if (token === generation.current && inFlight.current === controller) {
        inFlight.current = null;
        setBusy(false);
      }
    }
  }

  /** Abandons the request in flight; false when there was none. */
  function stop() {
    if (!inFlight.current) return false;
    inFlight.current.abort();
    inFlight.current = null;
    setBusy(false);
    setItems((prev) => [
      ...prev,
      { kind: "action", text: "Respuesta detenida", isError: false },
    ]);
    return true;
  }

  function send(message: string) {
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

  return {
    activeId,
    items,
    pending,
    busy,
    loading,
    announcement,
    isShown: (id: string) => id === shownId.current,
    reload: () => activeId && void load(activeId),
    showError,
    open,
    startNew,
    send,
    stop,
    resolvePending,
  };
}
