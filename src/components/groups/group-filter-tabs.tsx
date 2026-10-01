import {
  type TaskTabItem,
  TaskViewTabs,
} from "@/components/groups/group-task-tabs";
import { InboxIcon, ProgressGaugeIcon } from "@/components/ui/icons";

type GroupFilter = "activos" | "archivados";

const ITEMS: TaskTabItem<GroupFilter>[] = [
  {
    value: "activos",
    label: "Activos",
    icon: ProgressGaugeIcon,
    color: "var(--accent)",
  },
  {
    value: "archivados",
    label: "Archivados",
    icon: InboxIcon,
    color: "var(--status-paused)",
  },
];

export const GROUP_FILTER_PREFIX = "groups";

export function groupFilterPanelProps(showArchived: boolean) {
  const value: GroupFilter = showArchived ? "archivados" : "activos";
  return {
    id: `${GROUP_FILTER_PREFIX}-panel-${value}`,
    "aria-labelledby": `${GROUP_FILTER_PREFIX}-tab-${value}`,
  };
}

/** Active / archived switch above the group grid. */
export function GroupFilterTabs({
  showArchived,
  onChange,
}: {
  showArchived: boolean;
  onChange: (showArchived: boolean) => void;
}) {
  return (
    <TaskViewTabs
      items={ITEMS}
      idPrefix={GROUP_FILTER_PREFIX}
      ariaLabel="Filtrar grupos"
      active={showArchived ? "archivados" : "activos"}
      counts={{}}
      onChange={(value) => onChange(value === "archivados")}
    />
  );
}
