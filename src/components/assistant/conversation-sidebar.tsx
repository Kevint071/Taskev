import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  HistoryIcon,
  NewChatIcon,
  PanelRightIcon,
} from "@/components/ui/icons";

export function conversationCountLabel(count: number) {
  if (count === 0) return "Aún no hay conversaciones";
  if (count === 1) return "1 conversación";
  return `${count} conversaciones`;
}

/** Desktop panel with the saved conversations; it folds down to two icons. */
export function ConversationSidebar({
  collapsed,
  count,
  countLabel,
  onToggle,
  onNew,
  children,
}: {
  collapsed: boolean;
  count: number;
  countLabel: string;
  onToggle: () => void;
  onNew: () => void;
  /** The conversation list. */
  children: ReactNode;
}) {
  const toggleLabel = collapsed
    ? "Mostrar conversaciones"
    : "Ocultar conversaciones";

  return (
    <aside
      aria-label="Conversaciones"
      className={`hidden shrink-0 flex-col gap-3 border-l border-line bg-raised/40 py-4 transition-[width] duration-200 lg:flex ${
        collapsed ? "w-16 items-center px-2" : "w-72 px-3"
      }`}
    >
      {collapsed ? (
        <>
          <Button
            variant="ghost"
            onClick={onToggle}
            aria-expanded={false}
            aria-label={toggleLabel}
            title={`${toggleLabel} (${count})`}
            className="relative size-10 rounded-xl px-0"
          >
            <HistoryIcon className="size-5" />
            {count > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.6875rem] leading-none font-semibold text-accent-ink">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Button>
          <Button
            onClick={onNew}
            aria-label="Nueva conversación"
            title="Nueva conversación"
            className="size-10 rounded-xl border-line bg-transparent px-0 text-accent hover:border-accent/40 hover:bg-accent-soft"
          >
            <NewChatIcon className="size-5" />
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 pl-2">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-ui font-semibold">Conversaciones</h2>
              <p className="text-meta text-muted">{countLabel}</p>
            </div>
            <Button
              variant="ghost"
              onClick={onToggle}
              aria-expanded
              aria-label={toggleLabel}
              title={toggleLabel}
              className="size-8 rounded-lg px-0"
            >
              <PanelRightIcon className="size-4.5" />
            </Button>
          </div>
          <Button
            onClick={onNew}
            className="h-10 justify-start gap-2.5 rounded-xl border-line bg-transparent px-3 text-ink hover:border-accent/40 hover:bg-accent-soft"
          >
            <NewChatIcon className="size-4 text-accent" />
            Nueva conversación
          </Button>
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-2">
            {children}
          </div>
        </>
      )}
    </aside>
  );
}
