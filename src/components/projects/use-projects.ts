import { useEffect, useState } from "react";
import type { ProjectSummary } from "@/components/project-types";
import { handleUnauthenticated } from "@/lib/api-client";

/** Loads the active or archived project list, reloading when the filter changes. */
export function useProjects(showArchived: boolean) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(archived: boolean) {
    setLoading(true);
    const res = await fetch(`/api/projects?archived=${archived}`);
    if (handleUnauthenticated(res)) return;
    const data = await res.json();
    setProjects(data);
    setLoading(false);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load is redefined every render and only reads showArchived via its argument
  useEffect(() => {
    load(showArchived);
  }, [showArchived]);

  return { projects, loading, reload: () => load(showArchived) };
}
