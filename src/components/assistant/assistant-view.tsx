"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { pickProvider } from "@/lib/ai/conversations";
import type { Provider } from "@/lib/ai/provider";
import { AssistantHeader } from "./assistant-header";
import { ChatComposer } from "./chat-composer";
import { ChatTranscript } from "./chat-transcript";
import { type ConversationItem, ConversationList } from "./conversation-list";
import {
  ConversationSidebar,
  conversationCountLabel,
} from "./conversation-sidebar";
import { useAssistantChat } from "./use-assistant-chat";
import { useChatComposer } from "./use-chat-composer";
import { useConversations } from "./use-conversations";
import { useDeleteConversation } from "./use-delete-conversation";
import { useModelSelection } from "./use-model-selection";
import { usePanelCollapsed } from "./use-panel-collapsed";
import { useScrollToEnd } from "./use-scroll-to-end";

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
  const [provider, setProvider] = useState<Provider>(
    () =>
      pickProvider([initialConversations[0]?.provider], providers) ??
      providers[0],
  );
  const [listOpen, setListOpen] = useState(false);
  const panel = usePanelCollapsed();
  const models = useModelSelection(provider, providers);
  const saved = useConversations(initialConversations);
  const chat = useAssistantChat({
    providers,
    conversations: saved.conversations,
    provider,
    setProvider,
    model: models.model,
    modelApi: models.api,
    upsertConversation: saved.upsert,
    removeConversation: saved.remove,
  });
  const composer = useChatComposer({
    disabled: chat.busy || chat.loading,
    onSend: chat.send,
  });
  const { endRef, keepEndInView } = useScrollToEnd(
    chat.items.length,
    chat.pending,
    chat.busy,
  );

  function startNew() {
    setListOpen(false);
    chat.startNew();
    composer.reset();
  }

  function openConversation(id: string) {
    setListOpen(false);
    chat.open(id);
  }

  function stop() {
    if (chat.stop()) composer.focus();
  }

  const deletion = useDeleteConversation({
    onDeleted: (id) => {
      saved.remove(id);
      if (chat.isShown(id)) startNew();
    },
    onFailed: () =>
      chat.showError(
        "No se pudo eliminar la conversación. Inténtalo de nuevo.",
      ),
  });

  const actionPending = chat.pending !== null;
  const countLabel = conversationCountLabel(saved.conversations.length);
  const list = (
    <ConversationList
      conversations={saved.conversations}
      activeId={chat.activeId}
      onOpen={openConversation}
      onRename={saved.rename}
      onDelete={deletion.ask}
    />
  );

  return (
    <div className="flex min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-220 min-w-0 flex-1 flex-col">
        <h1 className="sr-only">Asistente</h1>
        <AssistantHeader
          providers={providers}
          provider={provider}
          providerLocked={chat.busy || actionPending}
          actionPending={actionPending}
          countLabel={countLabel}
          onProviderChange={setProvider}
          onOpenHistory={() => setListOpen(true)}
          onNew={startNew}
        />
        <ChatTranscript
          items={chat.items}
          pending={chat.pending}
          busy={chat.busy}
          loading={chat.loading}
          announcement={chat.announcement}
          endRef={endRef}
          onPickSuggestion={composer.pickSuggestion}
          onTyping={keepEndInView}
          onReload={chat.reload}
          onResolvePending={chat.resolvePending}
        />
        <ChatComposer
          composer={composer}
          models={models}
          busy={chat.busy}
          loading={chat.loading}
          actionPending={actionPending}
          onStop={stop}
        />
      </div>

      <ConversationSidebar
        collapsed={panel.collapsed}
        count={saved.conversations.length}
        countLabel={countLabel}
        onToggle={panel.toggle}
        onNew={startNew}
      >
        {list}
      </ConversationSidebar>

      <BottomSheet
        open={listOpen}
        title="Historial"
        showClose={false}
        onClose={() => setListOpen(false)}
      >
        {list}
      </BottomSheet>

      <ConfirmDialog
        open={deletion.target !== null}
        title="¿Eliminar esta conversación?"
        description={
          deletion.target
            ? `«${deletion.target.title}» y todos sus mensajes se borrarán para siempre.`
            : ""
        }
        confirmLabel="Eliminar"
        pending={deletion.deleting}
        onConfirm={deletion.confirm}
        onClose={deletion.cancel}
      />
    </div>
  );
}
