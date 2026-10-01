"use client";

import { useState } from "react";
import { LockIcon } from "@/components/ui/icons";
import { PROVIDERS, type Provider } from "@/lib/ai/provider";
import { AssistantKeyRow } from "./assistant-key-row";
import type { KeyStatus } from "./key-providers";
import { Card, CardHeader } from "./settings-card";

export function AssistantSection({
  keys,
}: {
  keys: Record<Provider, KeyStatus>;
}) {
  // One row edits at a time, so the list stays compact.
  const [editing, setEditing] = useState<Provider | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title="API keys"
          description="El asistente usa tus propias keys, así que el uso y la cuota van a tu cuenta de cada proveedor."
        />
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {PROVIDERS.map((provider) => (
            <AssistantKeyRow
              key={provider}
              provider={provider}
              initialStatus={keys[provider]}
              editing={editing === provider}
              onEdit={() => setEditing(provider)}
              onClose={() => setEditing(null)}
            />
          ))}
        </ul>
      </Card>

      <p className="flex gap-2 px-1 text-meta text-muted">
        <LockIcon className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Cuando usas el asistente, los grupos, tareas y comentarios que
          consulta se envían al proveedor que elijas (Google, Groq, OpenRouter,
          que a su vez lo reenvía a quien sirve el modelo, o GitHub Copilot)
          usando tu key. Con GitHub Copilot, las consultas cuentan contra tu
          cuota de Copilot. Las conversaciones se guardan en Taskev hasta que
          las borres. Las keys se guardan cifradas y nunca se vuelven a mostrar
          completas.
        </span>
      </p>
    </div>
  );
}
