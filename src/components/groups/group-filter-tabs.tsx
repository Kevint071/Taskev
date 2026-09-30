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
      data-motion-ok=""
      className="inline-flex gap-1 self-start rounded-full bg-sunken p-1"
    >
      {TABS.map((tab) => {
        const active = tab.value === showArchived;
        return (
          <button
            key={tab.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.value)}
            className={`min-h-10 rounded-full px-5 font-medium transition-[background-color,color,box-shadow] duration-200 ${
              active
                ? "bg-raised text-ink shadow-panel ring-1 ring-line"
                : "text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
