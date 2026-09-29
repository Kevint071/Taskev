/**
 * The "AI is typing" effect: a finished reply is revealed progressively.
 * These helpers decide how much text is on screen at a given moment; the
 * component only drives the clock.
 */

export const TYPING_CHARS_PER_SECOND = 120;
/** Long replies speed up instead of dragging on. */
export const TYPING_MAX_MS = 6000;

/** How many characters of a `total`-long reply are revealed after `elapsedMs`. */
export function revealedChars(elapsedMs: number, total: number): number {
  if (total <= 0) return 0;
  const duration = Math.min(
    TYPING_MAX_MS,
    (total / TYPING_CHARS_PER_SECOND) * 1000,
  );
  if (elapsedMs >= duration) return total;
  return Math.floor((total * elapsedMs) / duration);
}

// A list or heading marker with nothing after it yet.
const BARE_MARKER_PATTERN = /^\s*(?:[-*•]|\d+[.)]|#{1,6})\s*$/;
const BULLET_ASTERISK_PATTERN = /^(\s*)\*(\s)/;

/** The line's text up to any inline marker (`**`, `__`, `` ` ``, `*`) still open. */
function withoutOpenSpan(line: string): string {
  let result = line;
  for (const marker of ["**", "__", "`"]) {
    if (result.split(marker).length % 2 === 0) {
      result = result.slice(0, result.lastIndexOf(marker));
    }
  }
  // Single asterisks: a bullet's own asterisk and `**` pairs don't count.
  const masked = result
    .replace(BULLET_ASTERISK_PATTERN, "$1 $2")
    .replaceAll("**", "  ");
  if (masked.split("*").length % 2 === 0) {
    result = result.slice(0, masked.lastIndexOf("*"));
  }
  return result;
}

/**
 * The first `count` characters of `text`, trimmed to what parses cleanly as
 * Markdown: whole words, no bold/code/emphasis span that hasn't closed yet and
 * no bare list or heading marker. Otherwise the raw markers would flash on
 * screen and then turn into formatting.
 */
export function typedPrefix(text: string, count: number): string {
  if (count >= text.length) return text;
  let end = Math.max(0, count);
  // Mid-word: finish the word.
  if (end > 0 && !/\s/.test(text[end - 1])) {
    const rest = text.slice(end).search(/\s/);
    end = rest === -1 ? text.length : end + rest;
  }
  if (end >= text.length) return text;

  const prefix = text.slice(0, end);
  const lineStart = prefix.lastIndexOf("\n") + 1;
  const line = prefix.slice(lineStart);
  const shown = BARE_MARKER_PATTERN.test(line) ? "" : withoutOpenSpan(line);
  return (prefix.slice(0, lineStart) + shown).trimEnd();
}
