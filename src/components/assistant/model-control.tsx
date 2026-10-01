import { OptionPicker } from "./option-picker";
import type { ModelSelection } from "./use-model-selection";

/** The model picker, or just its name when the provider offers a single one. */
export function ModelControl({
  models,
  align,
  disabled,
  actionPending,
}: {
  models: ModelSelection;
  align: "left" | "right";
  disabled: boolean;
  /** An action awaits confirmation, which is why the picker is locked. */
  actionPending: boolean;
}) {
  if (models.options.length > 1) {
    return (
      <OptionPicker
        label="Modelo"
        value={models.model}
        options={models.options}
        onChange={models.pickModel}
        disabled={disabled}
        title={
          actionPending
            ? "Confirma o cancela la acción pendiente para cambiar de modelo"
            : undefined
        }
        opensUp
        align={align}
        sizeToValue
        triggerClassName="h-9 max-w-full gap-1! border-transparent bg-transparent px-1 hover:text-accent focus-visible:border-accent lg:h-10"
      />
    );
  }
  return (
    <span className="inline-flex h-9 max-w-full items-center px-1 text-meta font-medium text-muted lg:h-10">
      <span className="truncate">
        {models.loading
          ? "Cargando modelos…"
          : models.failed
            ? "No se pudieron cargar los modelos"
            : models.label}
      </span>
    </span>
  );
}
