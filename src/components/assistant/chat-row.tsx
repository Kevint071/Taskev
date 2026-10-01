import Link from "next/link";
import { CheckIcon, TriangleAlertIcon } from "@/components/ui/icons";
import { settingsHref } from "@/lib/settings-tabs";
import type { ChatItem } from "./chat-items";
import { TypedMarkdown } from "./typed-markdown";

export function ChatRow({
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
