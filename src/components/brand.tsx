/** Wordmark: a tick on a cobalt tile, then the name. */
import Image from "next/image";

export function Brand({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 leading-none text-body font-semibold tracking-tight ${className}`}
    >
      <Image
        src="/icon.svg"
        alt=""
        aria-hidden="true"
        width={28}
        height={28}
        className="size-7 shrink-0"
      />
      Taskev
    </span>
  );
}
