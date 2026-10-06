import { useEffect, useState } from "react";
import type { GroupSummary } from "@/components/group-types";
import { handleUnauthenticated } from "@/lib/api-client";

/** Fetches one group list; null when the session is gone and the user is redirected. */
async function fetchGroups(archived: boolean): Promise<GroupSummary[] | null> {
  const res = await fetch(`/api/groups?archived=${archived}`);
  if (handleUnauthenticated(res)) return null;
  return res.json();
}

/**
 * Loads the active or archived group list, reloading when the filter changes.
 * `activeGroups` always holds the active list, so the overview can keep
 * summarizing it while the archived tab is open.
 */
export function useGroups(showArchived: boolean) {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [activeGroups, setActiveGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  // True once the first list has arrived, so the page can reveal its chrome
  // together with the content instead of ahead of it.
  const [loaded, setLoaded] = useState(false);

  // `refreshActive` also refetches the active list while the archived tab is
  // open: needed only after an action that changes the active groups
  // (unarchiving), not when switching tabs or editing/deleting an archived
  // group, since the active list is already loaded and unchanged then.
  async function load(archived: boolean, refreshActive: boolean) {
    setLoading(true);
    const withActive = archived && refreshActive;
    const [list, active] = await Promise.all([
      fetchGroups(archived),
      withActive ? fetchGroups(false) : null,
    ]);
    if (!list || (withActive && !active)) return;
    setGroups(list);
    if (!archived) setActiveGroups(list);
    else if (active) setActiveGroups(active);
    setLoading(false);
    setLoaded(true);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load is redefined every render and only reads showArchived via its argument
  useEffect(() => {
    load(showArchived, false);
  }, [showArchived]);

  return {
    groups,
    activeGroups,
    loading,
    loaded,
    /** `activeChanged`: the action may have changed the active groups. */
    reload: (activeChanged: boolean) => load(showArchived, activeChanged),
  };
}
