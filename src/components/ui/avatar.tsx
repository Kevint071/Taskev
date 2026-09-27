import { getAvatarColor, getInitials } from "@/lib/avatar";

/** Initials on a hue derived from the identity (name, or email as fallback). */
export function Avatar({
  identity,
  className = "size-9 text-sm",
}: {
  identity: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{ backgroundColor: getAvatarColor(identity) }}
    >
      {getInitials(identity)}
    </span>
  );
}
