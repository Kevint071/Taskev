"use client";

import { type KeyboardEvent, useState } from "react";
import { HistoryIcon, MoreIcon } from "@/components/ui/icons";
import { Menu } from "@/components/ui/menu";
import { Popover } from "@/components/ui/popover";
import {
  groupByRecency,
  MAX_TITLE_LENGTH,
  parseTitle,
} from "@/lib/ai/conversations";
import { PROVIDER_NAMES, type Provider } from "@/lib/ai/provider";
import { formatShortDate, formatTime } from "@/lib/format";

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
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-sunken text-muted">
          <HistoryIcon className="size-5" />
        </span>
        <p className="text-ui font-medium">Aún no hay conversaciones</p>
        <p className="max-w-[24ch] text-meta text-muted">
          Cuando escribas al asistente, tus conversaciones aparecerán aquí.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {groupByRecency(conversations).map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h3 className="mb-1 px-3 text-meta font-medium text-muted">
            {group.label}
          </h3>
          <ul className="flex flex-col gap-px">
            {group.items.map((conversation) => (
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
        </section>
      ))}
    </div>
  );
}

/** Today's conversations show the hour; older ones, the day. */
function stampFor(iso: string, now = new Date()) {
  const date = new Date(iso);
  return date.toDateString() === now.toDateString()
    ? formatTime(iso)
    : formatShortDate(date);
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
          className="h-9 w-full rounded-control border border-control bg-raised px-2.5 text-ui text-ink outline-none focus-visible:border-accent"
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
      className={`group relative flex items-center rounded-lg transition-colors ${
        active ? "bg-accent-soft" : "hover:bg-sunken/70"
      }`}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute top-2.5 bottom-2.5 left-0 w-0.5 rounded-full bg-accent"
        />
      ) : null}
      <button
        type="button"
        onClick={() => onOpen(conversation.id)}
        aria-current={active ? "page" : undefined}
        className="flex min-h-12 min-w-0 flex-1 flex-col justify-center rounded-lg px-3 py-1.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <span
          className={`truncate text-ui ${active ? "font-semibold text-ink" : "font-medium"}`}
        >
          {conversation.title}
        </span>
        <span className="flex gap-2 text-meta text-muted">
          <span className="min-w-0 truncate">
            {PROVIDER_NAMES[conversation.provider]}
          </span>
          <span className="shrink-0 tabular-nums opacity-75">
            {stampFor(conversation.updatedAt)}
          </span>
        </span>
      </button>
      <Popover
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        // With a mouse the menu button appears on hover or focus; touch keeps it visible.
        className={`mr-1 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100 ${
          menuOpen ? "[@media(hover:hover)]:opacity-100" : ""
        }`}
      >
        <button
          type="button"
          aria-label={`Opciones de ${conversation.title}`}
          title="Opciones"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <MoreIcon className="size-5" />
        </button>
        {menuOpen && (
          <Menu
            onClose={() => setMenuOpen(false)}
            aria-label={`Opciones de ${conversation.title}`}
            className="animate-menu-in absolute top-full right-0 z-30 mt-1 w-40 rounded-xl border border-line bg-raised p-1 shadow-lg"
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
          </Menu>
        )}
      </Popover>
    </li>
  );
}
