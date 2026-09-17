export function ProgressChip({ value }: { value: number }) {
  const done = value >= 100;
  return (
    <span
      title={`Avance ${value}%`}
      className={`tabular inline-flex h-6 min-w-12 items-center justify-center rounded-full px-2 text-meta font-medium ${
        done ? "bg-status-done/15 text-status-done" : "bg-sunken text-ink"
      }`}
    >
      {value}%
    </span>
  );
}
