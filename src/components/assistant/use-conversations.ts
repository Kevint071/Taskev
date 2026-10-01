import { useState } from "react";
import { handleUnauthenticated } from "@/lib/api-client";
import type { ConversationItem } from "./conversation-list";

/** The saved conversations the sidebar lists, most recently used first. */
export function useConversations(initial: ConversationItem[]) {
  const [conversations, setConversations] = useState(initial);

  function upsert(conversation: ConversationItem) {
    setConversations((prev) => [
      conversation,
      ...prev.filter((c) => c.id !== conversation.id),
    ]);
  }

  function remove(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }

  /** Resolves to an error message, or null once renamed. */
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

  return { conversations, upsert, remove, rename };
}
