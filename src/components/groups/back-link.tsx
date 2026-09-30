import Link from "next/link";
import { BackIcon } from "@/components/ui/icons";

export function BackLink({
  href = "/groups",
  label = "Grupos",
}: {
  href?: string;
  label?: string;
} = {}) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 min-w-0 items-center gap-0.5 rounded-[14px] pr-3 pl-1.5 text-ui font-medium text-muted transition-colors hover:text-ink"
    >
      <BackIcon />
      <span className="truncate">{label}</span>
    </Link>
  );
}
