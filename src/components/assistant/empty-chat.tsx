import type { CSSProperties } from "react";
import { SparklesIcon } from "@/components/ui/icons";
import { SUGGESTIONS, type Suggestion } from "./suggestions";

/** Welcome shown before the first message, with ready-made starting points. */
export function EmptyChat({
  onPick,
}: {
  onPick: (suggestion: Suggestion) => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-8 px-4 py-4 md:px-0 md:py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent ring-1 ring-accent/15">
          <SparklesIcon className="size-7" />
        </span>
        <div className="space-y-2">
          <h2 className="text-headline font-semibold">¿En qué te ayudo hoy?</h2>
          <p className="mx-auto max-w-[46ch] text-muted">
            Consulta tus tareas o pide cambios en lenguaje normal. Borrar o
            archivar siempre te pedirá confirmación.
          </p>
        </div>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {SUGGESTIONS.map((suggestion, i) => (
          <li key={suggestion.title} className="contents">
            <button
              type="button"
              onClick={() => onPick(suggestion)}
              style={{ "--delay": `${i * 60}ms` } as CSSProperties}
              className="group animate-rise flex items-start gap-3 rounded-2xl border border-line bg-raised p-3.5 text-left shadow-panel transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_6px_18px_-8px_color-mix(in_srgb,var(--accent)_35%,transparent)]"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-accent-ink">
                <suggestion.icon className="size-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink">
                  {suggestion.title}
                </span>
                <span className="mt-0.5 block text-meta text-muted">
                  {suggestion.hint}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
