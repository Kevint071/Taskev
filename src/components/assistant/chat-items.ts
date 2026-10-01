import type { DisplayItem } from "@/lib/ai/agent";
import type { TranscriptItem } from "@/lib/db/schema";

export type ChatItem =
  | { kind: "user"; text: string }
  // `typing`: a reply that just arrived is typed out; loaded ones show whole.
  | { kind: "assistant"; text: string; typing?: boolean }
  | { kind: "action"; text: string; isError: boolean }
  | { kind: "error"; text: string; settingsLink: boolean; reload: boolean };

/** Codes after which the fix is in Settings, so the error links there. */
const KEY_ERRORS = new Set(["invalid_key", "no_key"]);

/** Markdown symbols would be read out loud, so they are dropped. */
export function spoken(text: string) {
  return text.replace(/[*_`#>|]+/g, "").trim();
}

export function toChatItem(item: DisplayItem): ChatItem {
  return item.type === "text"
    ? { kind: "assistant", text: item.text }
    : { kind: "action", text: item.text, isError: item.isError };
}

export function fromTranscript(item: TranscriptItem): ChatItem {
  return item.kind === "action"
    ? { kind: "action", text: item.text, isError: item.isError === true }
    : { kind: item.kind, text: item.text };
}

export function errorItem(
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
