import { Button } from "@/components/ui/button";
import { TriangleAlertIcon } from "@/components/ui/icons";
import type { PendingAction } from "@/lib/ai/agent";

/** Same tones as ConfirmDialog: red to delete, amber to (un)archive. */
export function PendingCard({
  action,
  disabled,
  onConfirm,
  onCancel,
}: {
  action: PendingAction;
  disabled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const destructive = action.name.startsWith("delete_");
  return (
    <section
      aria-label="Acción pendiente de confirmación"
      className="animate-reveal flex flex-col gap-4 self-stretch rounded-2xl border border-line bg-raised p-4 shadow-panel sm:self-start sm:min-w-90"
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
            destructive
              ? "bg-danger/10 text-danger"
              : "bg-[color-mix(in_srgb,var(--status-paused)_16%,var(--raised))] text-status-paused"
          }`}
        >
          <TriangleAlertIcon className="size-4" />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="font-semibold">{action.summary}</p>
          <p className="mt-0.5 text-meta text-muted">
            {destructive
              ? "No se puede deshacer. ¿Lo confirmas?"
              : "El asistente necesita tu confirmación."}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button disabled={disabled} onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant={destructive ? "danger-solid" : "primary"}
          disabled={disabled}
          onClick={onConfirm}
        >
          Confirmar
        </Button>
      </div>
    </section>
  );
}
