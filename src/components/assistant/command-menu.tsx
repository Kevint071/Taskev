import { SparklesIcon } from "@/components/ui/icons";
import type { SlashCommand } from "@/lib/ai/commands";
import { COMMAND_ICONS } from "./suggestions";

/** Listbox of slash commands; the textarea drives it (aria-activedescendant). */
export function CommandMenu({
  commands,
  active,
  onHover,
  onPick,
}: {
  commands: SlashCommand[];
  active: SlashCommand | undefined;
  onHover: (index: number) => void;
  onPick: (command: SlashCommand) => void;
}) {
  return (
    <div
      id="assistant-commands"
      role="listbox"
      aria-label="Comandos"
      className="animate-reveal absolute inset-x-0 bottom-full z-10 mb-2 flex flex-col gap-0.5 rounded-2xl border border-line bg-raised p-1.5 shadow-panel"
    >
      {commands.map((command, i) => {
        const Icon = COMMAND_ICONS[command.name] ?? SparklesIcon;
        const isActive = command === active;
        return (
          // biome-ignore lint/a11y/useKeyWithClickEvents: the textarea drives the listbox with the keyboard (aria-activedescendant)
          <div
            key={command.name}
            id={`assistant-command-${command.name}`}
            role="option"
            aria-selected={isActive}
            tabIndex={-1}
            // Keeps the textarea focused while the option is clicked.
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => onHover(i)}
            onClick={() => onPick(command)}
            className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 ${
              isActive ? "bg-accent-soft" : ""
            }`}
          >
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                isActive
                  ? "bg-accent text-accent-ink"
                  : "bg-accent-soft text-accent"
              }`}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink">
                /{command.name}
                <span className="ml-2 font-normal text-muted">
                  {command.title}
                </span>
              </span>
              <span className="block truncate text-meta text-muted">
                {command.hint}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
