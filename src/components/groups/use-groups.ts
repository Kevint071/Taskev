import { useEffect, useState } from "react";
import type { GroupSummary } from "@/components/group-types";
import { handleUnauthenticated } from "@/lib/api-client";

/** Loads the active or archived group list, reloading when the filter changes. */
export function useGroups(showArchived: boolean) {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(archived: boolean) {
    setLoading(true);
    const res = await fetch(`/api/groups?archived=${archived}`);
    if (handleUnauthenticated(res)) return;
    const data = await res.json();
    setGroups(data);
    setLoading(false);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load is redefined every render and only reads showArchived via its argument
  useEffect(() => {
    load(showArchived);
  }, [showArchived]);

  return { groups, loading, reload: () => load(showArchived) };
}
