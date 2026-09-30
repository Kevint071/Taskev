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
  // Two toggle buttons, not tabs: nothing here is a tab panel.
  return (
    // biome-ignore lint/a11y/useSemanticElements: a <fieldset> would draw a frame around the row
    <div
      role="group"
      aria-label="Filtrar grupos"
      className="flex gap-4 border-b border-line"
    >
      {TABS.map((tab) => {
        const active = tab.value === showArchived;
        return (
          <button
            key={tab.label}
            type="button"
            aria-pressed={active}
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
