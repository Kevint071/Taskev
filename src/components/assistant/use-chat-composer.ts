import { type KeyboardEvent, useRef, useState } from "react";
import {
  matchCommands,
  parseCommand,
  type SlashCommand,
} from "@/lib/ai/commands";
import type { Suggestion } from "./suggestions";

export type ChatComposer = ReturnType<typeof useChatComposer>;

/** The message box: its draft, the slash-command menu and the send rules. */
export function useChatComposer({
  disabled,
  onSend,
}: {
  /** A reply is on its way or a conversation is loading. */
  disabled: boolean;
  onSend: (message: string) => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  // Escape closes the command menu until the draft changes again.
  const [menuDismissed, setMenuDismissed] = useState(false);

  const commands = matchCommands(draft);
  const menuOpen = commands.length > 0 && !menuDismissed;
  const activeCommand = commands[Math.min(commandIndex, commands.length - 1)];

  function focus() {
    inputRef.current?.focus();
  }

  function changeDraft(text: string) {
    setDraft(text);
    setCommandIndex(0);
    setMenuDismissed(false);
  }

  function reset() {
    setDraft("");
    focus();
  }

  function submit(text: string) {
    const message = text.trim();
    if (!message || disabled) return;
    // A command that needs text has nothing to work on yet: keep typing.
    const command = parseCommand(message);
    if (command?.command.needsArgs && !command.args) {
      changeDraft(`/${command.command.name} `);
      focus();
      return;
    }
    changeDraft("");
    onSend(message);
  }

  function pickCommand(command: SlashCommand) {
    if (command.needsArgs) {
      changeDraft(`/${command.name} `);
      focus();
      return;
    }
    submit(`/${command.name}`);
  }

  function pickSuggestion(suggestion: Suggestion) {
    if (suggestion.send) {
      submit(suggestion.prompt);
      return;
    }
    changeDraft(suggestion.prompt);
    focus();
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
      submit(draft);
    }
  }

  return {
    inputRef,
    draft,
    commands,
    menuOpen,
    activeCommand,
    focus,
    reset,
    changeDraft,
    setCommandIndex,
    submit,
    pickCommand,
    pickSuggestion,
    handleKeyDown,
  };
}
