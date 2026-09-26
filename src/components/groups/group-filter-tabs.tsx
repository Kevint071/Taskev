const TABS = [
  { value: false, label: "Activos" },
  { value: true, label: "Archivados" },
];

export function GroupFilterTabs({
  showArchived,
  onChange,
}: {
  showArchived: boolean;
  onChange: (showArchived: boolean) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filtrar grupos"
      className="flex gap-4 border-b border-line"
    >
      {TABS.map((tab) => {
        const active = tab.value === showArchived;
        return (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`-mb-px border-b-2 pb-2 font-medium transition-colors ${
              active
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
