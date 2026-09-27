/** Two letters: first and last word of a name, or the start of an email. */
export function getInitials(identity: string): string {
  const words = identity.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1)
    return `${words[0][0]}${words.at(-1)?.[0]}`.toUpperCase();
  return identity.trim().slice(0, 2).toUpperCase();
}

/** A stable hue per identity, ignoring case and accents. */
export function getAvatarColor(identity: string): string {
  const normalized = identity
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  let hash = 0;
  for (const character of normalized)
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 58% 42%)`;
}
