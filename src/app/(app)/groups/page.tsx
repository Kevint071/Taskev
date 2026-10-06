"use client";

import { useState } from "react";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";
import {
  GroupFilterTabs,
  groupFilterPanelProps,
} from "@/components/groups/group-filter-tabs";
import { GroupGrid } from "@/components/groups/group-grid";
import {
  GroupsOverview,
  GroupsPageSkeleton,
} from "@/components/groups/groups-overview";
import {
  NewGroupButton,
  NewGroupFab,
} from "@/components/groups/new-group-button";
import { useGroups } from "@/components/groups/use-groups";
import { PageHeader } from "@/components/ui/panel";
import { Toast, type ToastState } from "@/components/ui/toast";

export default function GroupsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const { groups, activeGroups, loading, loaded, reload } =
    useGroups(showArchived);

  function handleCreated() {
    setCreating(false);
    if (showArchived) setShowArchived(false);
    else reload();
  }

  const startCreating = () => setCreating(true);

  // First load: one skeleton for the whole page, so nothing shows ahead of the rest.
  if (!loaded) return <GroupsPageSkeleton />;

  return (
    <>
      <PageHeader title="Grupos" />

      {activeGroups.length > 0 && <GroupsOverview groups={activeGroups} />}

      {creating && (
        <CreateGroupDialog
          onClose={() => setCreating(false)}
          onCreated={handleCreated}
        />
      )}

      <section className="flex flex-col gap-5 max-md:pb-20">
        <div className="relative">
          <GroupFilterTabs
            showArchived={showArchived}
            onChange={setShowArchived}
          />
          <div className="absolute inset-y-0 right-0 hidden items-center md:flex">
            <NewGroupButton onClick={startCreating} />
          </div>
        </div>
        <div role="tabpanel" {...groupFilterPanelProps(showArchived)}>
          <GroupGrid
            groups={groups}
            loading={loading}
            showArchived={showArchived}
            onUpdated={reload}
            onError={(message) =>
              setToast({ id: Date.now(), message, tone: "error" })
            }
          />
        </div>
      </section>
      <NewGroupFab onClick={startCreating} />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
