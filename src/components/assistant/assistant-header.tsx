import { Button } from "@/components/ui/button";
import { HistoryIcon, NewChatIcon } from "@/components/ui/icons";
import { PROVIDER_NAMES, type Provider } from "@/lib/ai/provider";
import { OptionPicker } from "./option-picker";

/** Top bar: history and new-chat on phones, plus the provider picker. */
export function AssistantHeader({
  providers,
  provider,
  providerLocked,
  actionPending,
  countLabel,
  onProviderChange,
  onOpenHistory,
  onNew,
}: {
  providers: Provider[];
  provider: Provider;
  providerLocked: boolean;
  /** An action awaits confirmation, which is why the picker is locked. */
  actionPending: boolean;
  countLabel: string;
  onProviderChange: (provider: Provider) => void;
  onOpenHistory: () => void;
  onNew: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 pt-3 md:px-10 lg:pt-4">
      <button
        type="button"
        onClick={onOpenHistory}
        aria-label={`Historial, ${countLabel}`}
        title={`Historial, ${countLabel}`}
        className="flex size-13 shrink-0 items-center justify-center rounded-2xl border border-line bg-raised text-accent shadow-panel transition-colors hover:border-accent/40 lg:hidden"
      >
        <HistoryIcon className="size-5" />
      </button>
      {providers.length > 1 ? (
        <OptionPicker
          label="Proveedor"
          value={provider}
          options={providers.map((p) => ({
            id: p,
            label: PROVIDER_NAMES[p],
          }))}
          onChange={(next) => onProviderChange(next as Provider)}
          disabled={providerLocked}
          title={
            actionPending
              ? "Confirma o cancela la acción pendiente para cambiar de proveedor"
              : undefined
          }
          className="ml-auto"
          sizeToValue
          triggerClassName="h-11 border-line-strong bg-raised pr-2.5 pl-3.5 shadow-panel hover:border-ink/30 focus-visible:border-accent lg:h-9 lg:pl-3"
        />
      ) : (
        <span className="ml-auto inline-flex h-11 items-center rounded-full bg-sunken px-3 text-meta font-medium text-muted lg:h-9">
          {PROVIDER_NAMES[provider]}
        </span>
      )}
      <Button
        variant="primary"
        onClick={onNew}
        aria-label="Nueva conversación"
        title="Nueva conversación"
        className="size-13 rounded-2xl px-0 lg:hidden"
      >
        <NewChatIcon className="size-6" />
      </Button>
    </div>
  );
}
