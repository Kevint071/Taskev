import { Button } from "@/components/ui/button";
import { SendIcon, StopIcon } from "@/components/ui/icons";
import { CommandMenu } from "./command-menu";
import { ModelControl } from "./model-control";
import type { ChatComposer as Composer } from "./use-chat-composer";
import type { ModelSelection } from "./use-model-selection";

const MAX_LENGTH = 4000;
/** From here on the character counter is shown. */
const COUNTER_FROM = 3500;

/** The input form: command menu, textarea, model picker and send/stop. */
export function ChatComposer({
  composer,
  models,
  busy,
  loading,
  actionPending,
  onStop,
}: {
  composer: Composer;
  models: ModelSelection;
  busy: boolean;
  loading: boolean;
  actionPending: boolean;
  onStop: () => void;
}) {
  const { draft, menuOpen, activeCommand } = composer;
  const modelLocked = busy || actionPending;
  const showCounter = draft.length > COUNTER_FROM;
  // Rendered twice (below/above the input, and beside the send button), one of
  // them hidden by CSS at each breakpoint.
  const modelControl = (align: "left" | "right") => (
    <ModelControl
      models={models}
      align={align}
      disabled={modelLocked}
      actionPending={actionPending}
    />
  );

  return (
    <div className="flex flex-col px-4 pt-2 pb-4 md:px-10 md:pb-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          composer.submit(draft);
        }}
        className="relative flex flex-col gap-1 rounded-[31px] border border-line-strong bg-raised p-2 shadow-[0_8px_30px_-12px_rgba(26,35,50,0.25)] transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_16%,transparent),0_8px_30px_-12px_rgba(26,35,50,0.25)]"
      >
        {menuOpen ? (
          <CommandMenu
            commands={composer.commands}
            active={activeCommand}
            onHover={composer.setCommandIndex}
            onPick={composer.pickCommand}
          />
        ) : null}
        <label htmlFor="assistant-input" className="sr-only">
          Mensaje para el asistente
        </label>
        {/* Centered while the (possibly wrapped) placeholder shows; pinned to
            the last line once there is text to grow. */}
        <div
          className={`flex gap-2 ${draft === "" ? "items-center" : "items-end"}`}
        >
          <textarea
            id="assistant-input"
            ref={composer.inputRef}
            rows={1}
            value={draft}
            onChange={(e) => composer.changeDraft(e.target.value)}
            onKeyDown={composer.handleKeyDown}
            role="combobox"
            aria-expanded={menuOpen}
            aria-controls="assistant-commands"
            aria-autocomplete="list"
            aria-activedescendant={
              menuOpen && activeCommand
                ? `assistant-command-${activeCommand.name}`
                : undefined
            }
            placeholder="Pregunta o escribe / para ver comandos…"
            maxLength={MAX_LENGTH}
            className="field-sizing-content max-h-48 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-ink outline-none placeholder:text-muted focus-visible:shadow-none"
          />
          {/* From lg up the model sits beside the send button. */}
          <div className="hidden shrink-0 lg:block">
            {modelControl("right")}
          </div>
          {/* Send and stop are separate elements, so a click that starts a
              request never lands on a button that has already changed role. */}
          {busy ? (
            <Button
              key="stop"
              type="button"
              variant="primary"
              onClick={onStop}
              aria-label="Detener"
              title="Detener"
              className="size-10! shrink-0 rounded-full px-0"
            >
              <StopIcon />
            </Button>
          ) : (
            <Button
              key="send"
              type="submit"
              variant="primary"
              disabled={loading || draft.trim() === ""}
              aria-label="Enviar"
              className="size-10! shrink-0 rounded-full px-0 transition-[background-color,opacity,transform] enabled:hover:scale-105 disabled:bg-accent/60 disabled:text-accent-ink/80 disabled:opacity-100"
            >
              <SendIcon />
            </Button>
          )}
        </div>
      </form>
      {/* Above the input on mobile, below it on md; from lg the model sits
          beside the send button, so only the counter stays in this row. */}
      <div
        className={`order-first mb-1 flex items-center gap-2 px-3 md:order-0 md:mt-1 md:mb-0 ${
          showCounter ? "" : "lg:hidden"
        }`}
      >
        <div className="min-w-0 shrink lg:hidden">{modelControl("left")}</div>
        {showCounter ? (
          <p className="ml-auto shrink-0 pr-2 text-meta text-muted">
            {draft.length}/{MAX_LENGTH}
          </p>
        ) : null}
      </div>
    </div>
  );
}
