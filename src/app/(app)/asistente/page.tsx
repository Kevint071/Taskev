import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AssistantView } from "@/components/assistant/assistant-view";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { configuredProviders, getStoredKeys } from "@/lib/ai/key-store";
import { getCurrentUser } from "@/lib/auth-guard";
import { listConversations } from "@/lib/data/conversations";
import { settingsHref } from "@/lib/settings-tabs";

export const metadata: Metadata = { title: "Asistente | Taskev" };

export default async function AssistantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const providers = configuredProviders(await getStoredKeys(user.id));

  if (providers.length === 0) {
    return (
      <>
        <PageHeader
          title="Asistente"
          description="Consulta y gestiona tus grupos y tareas conversando."
        />
        <EmptyState
          title="Configura una API key para empezar"
          description="El asistente usa tu propia API key de Gemini o de Groq. Guarda al menos una en Ajustes para empezar a conversar."
          action={
            <ButtonLink href={settingsHref("asistente")} variant="primary">
              Ir a Ajustes
            </ButtonLink>
          }
        />
      </>
    );
  }

  const conversations = await listConversations(user.id);
  return (
    <AssistantView
      providers={providers}
      initialConversations={conversations.map((c) => ({
        ...c,
        updatedAt: c.updatedAt.toISOString(),
      }))}
    />
  );
}
