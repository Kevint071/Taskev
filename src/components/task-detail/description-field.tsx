import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { FlashWrap } from "./flash-wrap";
import { autosize, centerTextareaEnd, useAutosize } from "./use-autosize";

/** Editable description; commits on blur, Escape discards the edit. */
export function DescriptionField({
  description,
  flashTick,
  onCommit,
}: {
  description: string | null;
  flashTick: number;
  onCommit: (description: string) => void;
}) {
  const saved = description ?? "";
  const [draft, setDraft] = useState(saved);
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const cancelEdit = useRef(false);

  // Resync the draft if the task changes from outside (e.g. a reload).
  useEffect(() => setDraft(saved), [saved]);
  useAutosize(ref);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Draft changes trigger sizing after React updates the controlled textarea.
  useEffect(() => {
    const el = ref.current;
    autosize(el);
    if (document.activeElement === el) centerTextareaEnd(el);
  }, [draft, expanded]);

  function commit() {
    if (cancelEdit.current) {
      cancelEdit.current = false;
      setDraft(saved);
      return;
    }
    if (draft !== saved) onCommit(draft);
  }

  const toggleLabel = expanded
    ? "Contraer descripción"
    : "Expandir descripción";

  return (
    <section aria-label="Descripción" className="mt-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-ui font-semibold text-ink">Descripción</h2>
        <button
          type="button"
          aria-label={toggleLabel}
          aria-expanded={expanded}
          aria-controls="task-description"
          title={toggleLabel}
          onClick={() => setExpanded((value) => !value)}
          className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <ChevronDownIcon
            className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      <FlashWrap tick={flashTick} className="rounded-xl border-transparent">
        <label className="block">
          <span className="sr-only">Descripción</span>
          <textarea
            id="task-description"
            ref={ref}
            value={draft}
            placeholder="Añade notas, contexto, enlaces…"
            onChange={(e) => {
              setDraft(e.target.value);
              autosize(e.target);
              centerTextareaEnd(e.target);
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit.current = true;
                e.currentTarget.blur();
              }
            }}
            rows={3}
            className={`block min-h-24 w-full resize-none overflow-y-auto rounded-xl border border-control bg-sunken/55 px-4 py-3 text-[15px] leading-7 text-ink caret-accent transition-[background-color,border-color,box-shadow] placeholder:text-muted hover:border-ink/40 focus:border-accent focus:bg-raised focus-visible:ring-2 focus-visible:ring-accent/15 ${expanded ? "max-h-110" : "max-h-40"}`}
          />
        </label>
      </FlashWrap>
    </section>
  );
}
