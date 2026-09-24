import Link from "next/link";
import { BackIcon } from "@/components/ui/icons";

export function BackLink() {
  return (
    <Link
      href="/projects"
      className="inline-flex h-11 min-w-0 items-center gap-0.5 rounded-[14px] pr-3 pl-1.5 text-ui font-medium text-muted transition-colors hover:text-ink"
    >
      <BackIcon />
      <span className="truncate">Proyectos</span>
    </Link>
  );
}
