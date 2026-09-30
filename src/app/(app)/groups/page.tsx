"use client";

import { useState } from "react";
import { CreateGroupForm } from "@/components/groups/create-group-form";
import { GroupFilterTabs } from "@/components/groups/group-filter-tabs";
import { GroupGrid } from "@/components/groups/group-grid";
import { useGroups } from "@/components/groups/use-groups";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/panel";
import { Toast, type ToastState } from "@/components/ui/toast";

export default function GroupsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const { groups, loading, reload } = useGroups(showArchived);

  function handleCreated() {
    setCreating(false);
    if (showArchived) setShowArchived(false);
    else reload();
  }

  const openTotal = groups.reduce((sum, g) => sum + g.openCount, 0);
  const summary =
    !loading && !showArchived && groups.length > 0
      ? `${groups.length} ${groups.length === 1 ? "grupo activo" : "grupos activos"} y ${openTotal} ${openTotal === 1 ? "tarea abierta" : "tareas abiertas"}.`
      : "Agrupa tus tareas por objetivo. Archiva lo que ya no está activo.";

  return (
    <>
      <PageHeader
        title="Grupos"
        description={summary}
        actions={
          !creating && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <PlusIcon />
              Nuevo grupo
            </Button>
          )
        }
      />

      {creating && (
        <CreateGroupForm
          onClose={() => setCreating(false)}
          onCreated={handleCreated}
        />
      )}

      <section className="flex flex-col gap-3">
        <GroupFilterTabs
          showArchived={showArchived}
          onChange={setShowArchived}
        />
        <GroupGrid
          groups={groups}
          loading={loading}
          showArchived={showArchived}
          onCreate={creating ? undefined : () => setCreating(true)}
          onUpdated={reload}
          onError={(message) =>
            setToast({ id: Date.now(), message, tone: "error" })
          }
        />
      </section>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
