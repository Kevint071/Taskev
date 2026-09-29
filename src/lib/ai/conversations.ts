/**
 * Pure rules about saved conversations: their titles and which provider a
 * conversation talks to. Database access lives in lib/data/conversations.ts.
 */
import type { Provider } from "./provider";

/** Characters of the first message kept in an automatic title. */
export const TITLE_PREVIEW = 60;
export const MAX_TITLE_LENGTH = 100;

const DEFAULT_TITLE = "Nueva conversación";

export function titleFromMessage(message: string): string {
  const text = message.replace(/\s+/g, " ").trim();
  if (!text) return DEFAULT_TITLE;
  if (text.length <= TITLE_PREVIEW) return text;

  const cut = text.slice(0, TITLE_PREVIEW);
  const endsAtWord = text[TITLE_PREVIEW] === " ";
  const lastSpace = cut.lastIndexOf(" ");
  const head = endsAtWord || lastSpace <= 0 ? cut : cut.slice(0, lastSpace);
  return `${head.trimEnd()}…`;
}

export function parseTitle(
  raw: unknown,
): { ok: true; title: string } | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "El título no es válido" };
  }
  const title = raw.trim();
  if (!title) return { ok: false, error: "El título no puede estar vacío" };
  if (title.length > MAX_TITLE_LENGTH) {
    return {
      ok: false,
      error: `El título no puede superar los ${MAX_TITLE_LENGTH} caracteres`,
    };
  }
  return { ok: true, title };
}

export type RecencyGroup<T> = { label: string; items: T[] };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Splits items (newest first) into Hoy / Ayer / Últimos 7 días / Anteriores by
 * local calendar day, keeping their order and dropping empty groups.
 */
export function groupByRecency<T extends { updatedAt: string }>(
  items: T[],
  now: Date = new Date(),
): RecencyGroup<T>[] {
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const groups: RecencyGroup<T>[] = [
    { label: "Hoy", items: [] },
    { label: "Ayer", items: [] },
    { label: "Últimos 7 días", items: [] },
    { label: "Anteriores", items: [] },
  ];
  for (const item of items) {
    const days = Math.round(
      (today - startOfDay(new Date(item.updatedAt))) / DAY_MS,
    );
    const index = days <= 0 ? 0 : days === 1 ? 1 : days <= 7 ? 2 : 3;
    groups[index].items.push(item);
  }
  return groups.filter((g) => g.items.length > 0);
}

/**
 * The first candidate the user has a key for (e.g. the conversation's last
 * provider, then the latest conversation's), else any configured provider.
 */
export function pickProvider(
  candidates: (Provider | null | undefined)[],
  configured: readonly Provider[],
): Provider | null {
  for (const candidate of candidates) {
    if (candidate && configured.includes(candidate)) return candidate;
  }
  return configured[0] ?? null;
}
