import type { RefObject } from "react";
import { LoadingRows } from "@/components/ui/panel";
import type { PendingAction } from "@/lib/ai/agent";
import type { ChatItem } from "./chat-items";
import { ChatRow } from "./chat-row";
import { EmptyChat } from "./empty-chat";
import { PendingCard } from "./pending-card";
import type { Suggestion } from "./suggestions";

/** Scrollable conversation: welcome or messages, pending action, thinking. */
export function ChatTranscript({
  items,
  pending,
  busy,
  loading,
  announcement,
  endRef,
  onPickSuggestion,
  onTyping,
  onReload,
  onResolvePending,
}: {
  items: ChatItem[];
  pending: PendingAction | null;
  busy: boolean;
  loading: boolean;
  announcement: string;
  endRef: RefObject<HTMLDivElement | null>;
  onPickSuggestion: (suggestion: Suggestion) => void;
  onTyping: () => void;
  onReload: () => void;
  onResolvePending: (approved: boolean) => void;
}) {
  const lastUser = items.map((item) => item.kind).lastIndexOf("user");
  const empty = items.length === 0 && !busy && !loading;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 md:px-10 md:pt-10">
      <section
        aria-label="Conversación"
        className="flex min-h-full flex-col gap-3 pb-4"
      >
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>
        {loading ? <LoadingRows rows={3} /> : null}

        {empty ? <EmptyChat onPick={onPickSuggestion} /> : null}

        {items.map((item, i) => (
          <ChatRow
            // biome-ignore lint/suspicious/noArrayIndexKey: append-only transcript
            key={i}
            item={item}
            // Once the user writes again, whatever was still typing shows whole.
            typing={item.kind === "assistant" && !!item.typing && i > lastUser}
            onTyping={onTyping}
            onReload={onReload}
          />
        ))}

        {pending ? (
          <PendingCard
            action={pending}
            disabled={busy}
            onConfirm={() => onResolvePending(true)}
            onCancel={() => onResolvePending(false)}
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
  );
}
