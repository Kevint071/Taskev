import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { CheckIcon, LockIcon, TrashIcon } from "@/components/ui/icons";
import { PasswordInput } from "@/components/ui/password-input";
import { PROVIDER_NAMES, type Provider } from "@/lib/ai/provider";
import { KEY_PROVIDERS, type KeyStatus } from "./key-providers";
import { useApiKey } from "./use-api-key";

export function AssistantKeyRow({
  provider,
  initialStatus,
  editing,
  onEdit,
  onClose,
}: {
  provider: Provider;
  initialStatus: KeyStatus;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
}) {
  const meta = KEY_PROVIDERS[provider];
  const name = PROVIDER_NAMES[provider];
  const key = useApiKey(provider, initialStatus, onClose);
  const { status } = key;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (editing) formRef.current?.querySelector("input")?.focus();
  }, [editing]);

  return (
    <li>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
            status.configured
              ? "bg-status-done text-raised"
              : "border border-line-strong text-muted"
          }`}
        >
          {status.configured ? (
            <CheckIcon className="size-4" />
          ) : (
            <LockIcon className="size-4" />
          )}
        </span>
        <div className="min-w-32 flex-1">
          <p className="font-medium">{name}</p>
          {key.saved ? (
            <output className="animate-caption-in block text-meta font-medium text-status-done">
              {key.saved}
            </output>
          ) : key.error && !editing ? (
            <p role="alert" className="text-meta font-medium text-danger">
              {key.error}
            </p>
          ) : (
            <p className="text-meta text-muted">
              {status.configured
                ? `Configurada${status.last4 ? `, ••••${status.last4}` : ""}`
                : "Sin configurar"}
            </p>
          )}
        </div>
        {editing ? null : (
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant={status.configured ? "secondary" : "primary"}
              onClick={() => {
                key.startEditing();
                onEdit();
              }}
            >
              {status.configured ? "Reemplazar" : "Añadir"}
            </Button>
            {status.configured ? (
              <Button
                size="sm"
                variant="danger"
                aria-label={`Eliminar la API key de ${name}`}
                className="w-8 px-0"
                onClick={() => key.setConfirmOpen(true)}
              >
                <TrashIcon />
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {editing ? (
        <form
          ref={formRef}
          onSubmit={key.submit}
          className="flex flex-col gap-3 border-t border-line bg-sunken/50 px-5 py-4"
        >
          <Field
            label={status.configured ? "Nueva API key" : "API key"}
            error={key.error}
            hint={
              <>
                {meta.free ? "Puedes crear una gratis en" : "Puedes crearla en"}{" "}
                <a
                  href={meta.consoleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  {meta.consoleName}
                </a>
                .
              </>
            }
          >
            <PasswordInput
              revealNoun="API key"
              autoComplete="off"
              spellCheck={false}
              placeholder="Pega aquí tu API key"
              value={key.apiKey}
              onChange={(e) => key.changeKey(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                key.cancel();
                onClose();
              }}
              disabled={key.pending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={key.pending || key.apiKey.trim() === ""}
            >
              {key.pending ? "Verificando…" : "Guardar"}
            </Button>
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={key.confirmOpen}
        title={`¿Eliminar tu API key de ${name}?`}
        description={`No podrás usar ${name} en el asistente hasta que guardes otra key.`}
        confirmLabel="Eliminar key"
        pending={key.deleting}
        onConfirm={key.remove}
        onClose={() => key.setConfirmOpen(false)}
      />
    </li>
  );
}
