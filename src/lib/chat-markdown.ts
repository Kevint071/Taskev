/**
 * A deliberately small Markdown subset for assistant replies. Some models
 * (gpt-oss on Groq) answer in Markdown even when told not to, so the chat
 * understands the bits they actually use instead of showing raw markers.
 */

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "code"; text: string };

/** Deeper indentation is flattened into `children`: one level of nesting. */
export type ListItem = { inlines: Inline[]; children: Inline[][] };

export type Block =
  | { kind: "paragraph"; lines: Inline[][] }
  | { kind: "heading"; level: number; inlines: Inline[] }
  | { kind: "divider" }
  | { kind: "list"; ordered: boolean; items: ListItem[] };

const INLINE_PATTERN = /\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|\*([^*\s][^*]*?)\*/g;
const BULLET_PATTERN = /^(\s*)[-*•]\s+(.*)$/;
const ORDERED_PATTERN = /^(\s*)\d+[.)]\s+(.*)$/;
const HEADING_PATTERN = /^\s*(#{1,6})\s+(.*)$/;
const DIVIDER_PATTERN = /^\s*([-*_])(\s*\1){2,}\s*$/;
// gpt-oss separates numbers and words with U+202F, which renders almost
// zero-width in the UI font; a regular no-break space keeps it together.
const NARROW_SPACE_PATTERN = / /g;

export function parseInline(text: string): Inline[] {
  const spans: Inline[] = [];
  let cursor = 0;
  for (const match of text.matchAll(INLINE_PATTERN)) {
    if (match.index > cursor) {
      spans.push({ kind: "text", text: text.slice(cursor, match.index) });
    }
    const [, strong, underscored, code, em] = match;
    if (strong !== undefined || underscored !== undefined) {
      spans.push({ kind: "strong", text: strong ?? underscored });
    } else if (code !== undefined) {
      spans.push({ kind: "code", text: code });
    } else {
      spans.push({ kind: "em", text: em });
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    spans.push({ kind: "text", text: text.slice(cursor) });
  }
  return spans.map((span) => ({
    ...span,
    text: span.text.replace(NARROW_SPACE_PATTERN, " "),
  }));
}

export function parseChatMarkdown(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: Inline[][] | null = null;
  let list: Extract<Block, { kind: "list" }> | null = null;

  const close = () => {
    paragraph = null;
    list = null;
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line.trim() === "") {
      close();
      continue;
    }

    if (DIVIDER_PATTERN.test(line)) {
      close();
      blocks.push({ kind: "divider" });
      continue;
    }

    const heading = HEADING_PATTERN.exec(line);
    if (heading) {
      close();
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        inlines: parseInline(heading[2]),
      });
      continue;
    }

    const bullet = BULLET_PATTERN.exec(line);
    const numbered = bullet ? null : ORDERED_PATTERN.exec(line);
    const item = bullet ?? numbered;
    if (item) {
      const [, indent, content] = item;
      const parent = list?.items.at(-1);
      if (indent.length > 0 && parent) {
        parent.children.push(parseInline(content));
        continue;
      }
      const ordered = numbered !== null;
      if (list === null || list.ordered !== ordered) {
        close();
        list = { kind: "list", ordered, items: [] };
        blocks.push(list);
      }
      list.items.push({ inlines: parseInline(content), children: [] });
      continue;
    }

    if (paragraph === null) {
      close();
      paragraph = [];
      blocks.push({ kind: "paragraph", lines: paragraph });
    }
    paragraph.push(parseInline(line.trim()));
  }

  return blocks;
}
