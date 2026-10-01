export function OpenCount({
  open,
  total,
  numberClassName = "",
}: {
  open: number;
  total: number;
  /** Extra classes for the number, e.g. a larger size inside a card. */
  numberClassName?: string;
}) {
  return (
    <span className="tabular text-muted">
      <span className={`font-semibold text-ink ${numberClassName}`}>
        {open}
      </span>{" "}
      {open === 1 ? "abierta" : "abiertas"} de {total}
    </span>
  );
}
