import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AssistantView } from "@/components/assistant/assistant-view";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { getStoredKey } from "@/lib/ai/key-store";
import { getCurrentUser } from "@/lib/auth-guard";
import { settingsHref } from "@/lib/settings-tabs";

export const metadata: Metadata = { title: "Asistente | Taskev" };

export default async function AssistantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const configured = (await getStoredKey(user.id, "gemini")) !== null;

  if (!configured) {
    return (
      <>
        <PageHeader
          title="Asistente"
          description="Consulta y gestiona tus grupos y tareas conversando."
        />
        <EmptyState
          title="Configura tu API key de Gemini"
          description="El asistente usa tu propia API key de Gemini. Guárdala en Ajustes para empezar a conversar."
          action={
            <ButtonLink href={settingsHref("asistente")} variant="primary">
              Ir a Ajustes
            </ButtonLink>
          }
        />
      </>
    );
  }

  return <AssistantView />;
}
