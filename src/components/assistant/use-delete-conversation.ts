import { useState } from "react";
import { handleUnauthenticated } from "@/lib/api-client";
import type { ConversationItem } from "./conversation-list";

/** Asks for confirmation, then deletes a conversation on the server. */
export function useDeleteConversation({
  onDeleted,
  onFailed,
}: {
  onDeleted: (id: string) => void;
  onFailed: () => void;
}) {
  const [target, setTarget] = useState<ConversationItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    if (!target) return;
    const { id } = target;
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
    setTarget(null);
    if (ok) onDeleted(id);
    else onFailed();
  }

  return {
    target,
    deleting,
    ask: setTarget,
    cancel: () => setTarget(null),
    confirm,
  };
}
