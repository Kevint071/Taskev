"use client";

import { type KeyboardEvent, useState } from "react";
import { MoreIcon } from "@/components/ui/icons";
import { Popover } from "@/components/ui/popover";
import { MAX_TITLE_LENGTH, parseTitle } from "@/lib/ai/conversations";
import { PROVIDER_NAMES, type Provider } from "@/lib/ai/provider";
import { formatShortDate } from "@/lib/format";

export type ConversationItem = {
  id: string;
  title: string;
  provider: Provider;
  updatedAt: string;
};

/**
 * The user's saved conversations, most recent first. Each row opens its
 * conversation and has a menu to rename it in place or delete it.
 */
export function ConversationList({
  conversations,
  activeId,
  onOpen,
  onRename,
  onDelete,
}: {
  conversations: ConversationItem[];
  activeId: string | null;
  onOpen: (id: string) => void;
  /** Resolves to an error message, or null once renamed. */
  onRename: (id: string, title: string) => Promise<string | null>;
  onDelete: (conversation: ConversationItem) => void;
}) {
  if (conversations.length === 0) {
    return (
      <p className="px-3 py-2 text-meta text-muted">
        Tus conversaciones aparecerán aquí.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {conversations.map((conversation) => (
        <ConversationRow
          key={conversation.id}
          conversation={conversation}
          active={conversation.id === activeId}
          onOpen={onOpen}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

function ConversationRow({
  conversation,
  active,
  onOpen,
  onRename,
  onDelete,
}: {
  conversation: ConversationItem;
  active: boolean;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => Promise<string | null>;
  onDelete: (conversation: ConversationItem) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setMenuOpen(false);
    setDraft(conversation.title);
    setError(null);
    setEditing(true);
  }

  async function save() {
    if (saving) return;
    const parsed = parseTitle(draft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    if (parsed.title === conversation.title) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const failure = await onRename(conversation.id, parsed.title);
    setSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    setEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void save();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setEditing(false);
      setError(null);
    }
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-1 px-1 py-1">
        <label htmlFor={`rename-${conversation.id}`} className="sr-only">
          Nuevo título
        </label>
        <input
          id={`rename-${conversation.id}`}
          // biome-ignore lint/a11y/noAutofocus: the user just chose to rename this row
          autoFocus
          value={draft}
          maxLength={MAX_TITLE_LENGTH}
          disabled={saving}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => void save()}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? `rename-error-${conversation.id}` : undefined
          }
          className="h-9 w-full rounded-control border border-line-strong bg-raised px-2.5 text-ui text-ink outline-none focus:border-accent"
        />
        {error ? (
          <p
            id={`rename-error-${conversation.id}`}
            className="px-1 text-meta text-danger"
          >
            {error}
          </p>
        ) : (
          <p className="px-1 text-meta text-muted">
            Enter para guardar, Esc para cancelar.
          </p>
        )}
      </li>
    );
  }

  return (
    <li
      className={`group relative flex items-center gap-1 rounded-xl pr-1 transition-colors ${
        active ? "bg-accent-soft" : "hover:bg-sunken/70"
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(conversation.id)}
        aria-current={active ? "page" : undefined}
        className="flex min-h-11 min-w-0 flex-1 flex-col justify-center px-3 py-1.5 text-left"
      >
        <span
          className={`truncate text-ui ${active ? "font-semibold" : "font-medium"}`}
        >
          {conversation.title}
        </span>
        <span className="truncate text-meta text-muted">
          {PROVIDER_NAMES[conversation.provider]} ·{" "}
          {formatShortDate(new Date(conversation.updatedAt))}
        </span>
      </button>
      <Popover open={menuOpen} onClose={() => setMenuOpen(false)}>
        <button
          type="button"
          aria-label={`Opciones de ${conversation.title}`}
          title="Opciones"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex size-9 items-center justify-center rounded-control text-muted hover:bg-raised hover:text-ink"
        >
          <MoreIcon className="size-5" />
        </button>
        {menuOpen && (
          <div
            role="menu"
            aria-label={`Opciones de ${conversation.title}`}
            className="animate-menu-in absolute top-full right-0 z-30 w-40 rounded-control border border-line-strong bg-raised p-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={startEditing}
              className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-ui hover:bg-sunken"
            >
              Renombrar
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onDelete(conversation);
              }}
              className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-ui text-danger hover:bg-danger/10"
            >
              Eliminar
            </button>
          </div>
        )}
      </Popover>
    </li>
  );
}
