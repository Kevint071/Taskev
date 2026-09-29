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
    // The shell leaves this route unpadded for the chat layout.
    return (
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-8 px-4 pt-6 pb-8 md:px-10 md:pt-10 md:pb-16">
        <PageHeader
          title="Asistente"
          description="Consulta y gestiona tus grupos y tareas conversando."
        />
        <EmptyState
          title="Configura una API key para empezar"
          description="El asistente usa tu propia API key de Gemini, Groq, OpenRouter o un token de GitHub Copilot. Guarda al menos una en Ajustes para empezar a conversar."
          action={
            <ButtonLink href={settingsHref("asistente")} variant="primary">
              Ir a Ajustes
            </ButtonLink>
          }
        />
      </div>
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
