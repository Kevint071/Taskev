/**
 * Pure rules about saved conversations: their titles and which provider a
 * conversation talks to. Database access lives in lib/data/conversations.ts.
 */
import { parseCommand } from "./commands";
import type { GenerateResult, HistoryStep, Provider } from "./provider";

/** Characters of the first message kept in an automatic title. */
export const TITLE_PREVIEW = 60;
export const MAX_TITLE_LENGTH = 100;

const DEFAULT_TITLE = "Nueva conversación";

/**
 * Lowercase without accents. Lengths match the NFC input, so an index found in
 * the folded text points at the same place in the original.
 */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Openers that say how the user asks, not what about, matched on folded text:
 * greetings, courtesy and "can you tell me…". Stripped one after another.
 */
const OPENERS = [
  /^(?:hola|buenas(?:\s+(?:tardes|noches|dias))?|buenos\s+dias|hey|ey|oye|hi|hello)\b[\s,.!:;-]*/,
  /^(?:por\s+favor|porfa(?:vor)?|please)\b[\s,.!:;-]*/,
  // "que tal" alone is small talk only before a comma: "qué tal va X" is a question.
  /^(?:como\s+(?:te\s+va|estas|andas|te\s+encuentras)|que\s+tal(?:\s+(?:estas|todo|andas))?(?=\s*[,.!?])|espero\s+que\s+(?:estes|andes)(?:\s+(?:muy\s+)?bien)?)\b[\s,.!?:;-]*/,
  /^(?:me\s+)?(?:puedes|podrias|puede|podria|quieres)\b[\s,]*/,
  /^(?:quiero|necesito|quisiera)\s+que\s+(?:me\s+)?(?:digas|muestres|listes|ensenes|des|ayudes(?:\s+a|\s+con)?)\b[\s,]*/,
  /^(?:quiero|necesito|quisiera|queria|deseo|me\s+gustaria)(?:\s+(?:saber|ver|conocer))?\b[\s,]*/,
  /^(?:me\s+)?(?:ayudas|ayudarias)(?:\s+(?:a|con))?\b[\s,]*/,
  /^(?:ayudame|ayudarme)(?:\s+(?:a|con))?\b[\s,]*/,
  /^(?:dime|dame|muestrame|ensename|listame|decirme|mostrarme|ensenarme|darme|listarme)\b[\s,]*/,
];

/** Trailing courtesy or urgency: "…, por favor", "…, gracias", "… lo antes posible". */
const CLOSERS =
  /[\s,.!]*\b(?:por\s+favor|porfa(?:vor)?|gracias|please|cuanto\s+antes|lo\s+(?:mas\s+)?(?:pronto|rapido|antes)(?:\s+posible)?)$/;

/** "qué tareas tengo bloqueadas" → "tareas bloqueadas": the verb adds nothing. */
const ASKED = /^(?:que|cuales)\s+/;
const NOUN_THEN_HAVE =
  /^(\S+(?:\s+\S+)?)\s+(?:tengo|hay|me\s+quedan|quedan)\s+(?=\S)/;

/** Words a title should not end on once it is cut. */
const DANGLING = new Set(
  "a al como con cuando cual cuales de del el en es esa ese esta estas este estos ha hay he la las le les lo los me mi mis muy no o para por que se ser si sin sobre son su sus tan te tu tus un una unos unas y".split(
    " ",
  ),
);

function stripOpeners(text: string): string {
  let current = text;
  for (let pass = 0; pass < 8; pass++) {
    current = current.replace(/^[\s¿¡]+/, "");
    const folded = fold(current);
    if (folded.length !== current.length) break;
    let next = current;
    for (const opener of OPENERS) {
      const match = opener.exec(folded);
      if (match && match[0].length < current.length) {
        next = current.slice(match[0].length);
        break;
      }
    }
    if (next === current) break;
    current = next;
  }
  return current;
}

function toNounPhrase(text: string): string {
  const folded = fold(text);
  if (folded.length !== text.length) return text;
  const asked = ASKED.exec(folded);
  if (!asked) return text;
  const rest = text.slice(asked[0].length);
  const have = NOUN_THEN_HAVE.exec(fold(rest));
  if (!have) return text;
  return rest.slice(0, have[1].length) + " " + rest.slice(have[0].length);
}

function stripEnds(text: string): string {
  let current = text.replace(/[\s,.!?…]+$/, "");
  // "…, por favor" and "… lo antes posible" can come stacked.
  for (let pass = 0; pass < 3; pass++) {
    const folded = fold(current);
    const closer = folded.length === current.length && CLOSERS.exec(folded);
    if (!closer || closer[0].length >= current.length) break;
    current = current.slice(0, current.length - closer[0].length);
  }
  return current.replace(/^[\s¿¡]+/, "").replace(/[\s,;:.!?¿¡…-]+$/, "");
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("es") + text.slice(1);
}

/** Keeps `max` characters at a word boundary, without a dangling "de", "y"… */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const endsAtWord = text[max] === " ";
  const lastSpace = cut.lastIndexOf(" ");
  if (!endsAtWord && lastSpace <= 0) return `${cut.trimEnd()}…`;
  const words = (endsAtWord ? cut : cut.slice(0, lastSpace))
    .trimEnd()
    .split(" ");
  while (words.length > 1 && DANGLING.has(fold(words[words.length - 1]))) {
    words.pop();
  }
  return `${words.join(" ").replace(/[\s,;:-]+$/, "")}…`;
}

/** The subject of a free message, cleaned of how it was asked. */
function subjectOf(message: string, { bare = true } = {}): string {
  const whole = message.normalize("NFC").replace(/\s+/g, " ").trim();
  const opened = stripOpeners(whole);
  // The first sentence is the topic; a very short one ("Ok.") isn't enough.
  const first = opened.split(/(?<=[.!?…])\s+/)[0].trim();
  const sentence = first.length >= 10 ? first : opened;
  const trimmed = stripEnds(toNounPhrase(sentence));
  // "las tareas bloqueadas" reads better as a title without its article.
  const cleaned = bare
    ? trimmed.replace(/^(?:el|la|los|las|un|una|unos|unas)\s+(?=\S+\s+\S)/i, "")
    : trimmed;
  // Cleaning can leave nothing ("Hola", "por favor"): keep what was written.
  return (
    cleaned || stripEnds(whole) || (/[\p{L}\p{N}]/u.test(whole) ? whole : "")
  );
}

/**
 * A short, readable title from the first message, with no model call: the
 * command name for slash commands, otherwise the message minus greetings,
 * courtesy and question marks, cut at a word.
 */
export function titleFromMessage(message: string): string {
  const command = parseCommand(message);
  if (command) {
    // Arguments are the user's own words (a task name): keep their article.
    const detail = command.args ? subjectOf(command.args, { bare: false }) : "";
    const label = command.command.title;
    return detail
      ? truncate(`${label}: ${capitalize(detail)}`, TITLE_PREVIEW)
      : label;
  }
  const subject = subjectOf(message);
  if (!subject) return DEFAULT_TITLE;
  return truncate(capitalize(subject), TITLE_PREVIEW);
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

/** Appended to the system prompt of a conversation's first message. */
export const TITLE_INSTRUCTION = `Esta es la primera respuesta de la conversación. Cuando termines de responder, añade como última línea de tu mensaje final, sin nada después, un título de la conversación con este formato exacto:
[título: <tema en 2 a 6 palabras>]
El título nombra el tema como un sustantivo (por ejemplo «Tareas bloqueadas», «Prioridades de hoy» o «Revisión del informe de ventas»): en español, sin comillas, sin punto final y sin saludos. No lo menciones ni lo comentes.`;

const TITLE_MARKER = /\s*\[{1,2}\s*t[ií]tulo\s*:([^\]\n]*)\]{0,2}/giu;

/** A title a model wrote, tidied; null when it isn't usable. */
export function cleanModelTitle(raw: string): string | null {
  const text = raw
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .replace(/^\s*t[ií]tulo\s*:\s*/i, "")
    .replace(/[*`#]+/g, "")
    .replace(/^["'“”‘’«»\s¿¡]+|["'“”‘’«»\s]+$/g, "")
    .replace(/[\s,;:.!?…-]+$/, "");
  // Too short, or the model copied the template's <placeholder>.
  if (!/[\p{L}\p{N}]{3}/u.test(text) || /[<>]/.test(text)) return null;
  return truncate(capitalize(text), TITLE_PREVIEW);
}

/**
 * Removes the "[título: …]" line the model was asked for from every string in
 * `value` (its text and the steps kept in the history), and returns the title.
 */
export function takeTitleMarker<T>(value: T): {
  value: T;
  title: string | null;
} {
  const found: string[] = [];
  const clean = (node: unknown): unknown => {
    if (typeof node === "string") {
      return node.replace(TITLE_MARKER, (_, raw: string) => {
        found.push(raw);
        return "";
      });
    }
    if (Array.isArray(node)) return node.map(clean);
    if (node !== null && typeof node === "object") {
      return Object.fromEntries(
        Object.entries(node).map(([key, child]) => [key, clean(child)]),
      );
    }
    return node;
  };
  const cleaned = clean(value) as T;
  const title =
    found.map(cleanModelTitle).find((t): t is string => t !== null) ?? null;
  return { value: cleaned, title };
}

/**
 * Wraps the model call so the title line it was asked for never reaches the
 * transcript or the history; `title()` is the first usable one, or null.
 */
export function captureModelTitle(
  generate: (history: HistoryStep[]) => Promise<GenerateResult>,
) {
  let title: string | null = null;
  return {
    async generate(history: HistoryStep[]): Promise<GenerateResult> {
      const result = await generate(history);
      const text = takeTitleMarker(result.text);
      const steps = takeTitleMarker(result.steps);
      title ??= text.title ?? steps.title;
      return { ...result, text: text.value, steps: steps.value };
    },
    title: () => title,
  };
}
