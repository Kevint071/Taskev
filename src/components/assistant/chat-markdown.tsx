import { Fragment } from "react";
import { type Inline, parseChatMarkdown } from "@/lib/chat-markdown";

// Blocks and spans come from a fixed string and never reorder, so their
// position is a stable key.

function InlineSpans({ spans }: { spans: Inline[] }) {
  return spans.map((span, i) => {
    switch (span.kind) {
      case "strong":
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: derived from immutable text
          <strong key={i} className="font-semibold">
            {span.text}
          </strong>
        );
      case "em":
        // biome-ignore lint/suspicious/noArrayIndexKey: derived from immutable text
        return <em key={i}>{span.text}</em>;
      case "code":
        return (
          <code
            // biome-ignore lint/suspicious/noArrayIndexKey: derived from immutable text
            key={i}
            className="rounded bg-line/60 px-1 font-mono text-[0.9em]"
          >
            {span.text}
          </code>
        );
      default:
        // biome-ignore lint/suspicious/noArrayIndexKey: derived from immutable text
        return <Fragment key={i}>{span.text}</Fragment>;
    }
  });
}

export function ChatMarkdown({ text }: { text: string }) {
  return parseChatMarkdown(text).map((block, i) => {
    switch (block.kind) {
      case "divider":
        // biome-ignore lint/suspicious/noArrayIndexKey: derived from immutable text
        return <hr key={i} className="border-line" />;
      case "heading":
        return (
          <p
            // biome-ignore lint/suspicious/noArrayIndexKey: derived from immutable text
            key={i}
            className={`font-semibold text-ink not-first:pt-2 ${block.level <= 2 ? "text-base" : "text-[0.95rem]"}`}
          >
            <InlineSpans spans={block.inlines} />
          </p>
        );
      case "list": {
        const List = block.ordered ? "ol" : "ul";
        // Items that span several lines need more air between them.
        const roomy = block.items.some((item) => item.details.length > 0);
        return (
          <List
            // biome-ignore lint/suspicious/noArrayIndexKey: derived from immutable text
            key={i}
            className={`${block.ordered ? "list-decimal" : "list-disc"} ${roomy ? "space-y-2" : "space-y-1"} pl-5`}
          >
            {block.items.map((item, j) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: derived from immutable text
              <li key={j}>
                <InlineSpans spans={item.inlines} />
                {item.details.map((detail, k) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: derived from immutable text
                  <span key={k} className="block">
                    <InlineSpans spans={detail} />
                  </span>
                ))}
                {item.children.length > 0 && (
                  <ul className="mt-1 list-[circle] space-y-0.5 pl-5 text-muted">
                    {item.children.map((child, k) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: derived from immutable text
                      <li key={k}>
                        <InlineSpans spans={child} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </List>
        );
      }
      default:
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: derived from immutable text
          <p key={i}>
            {block.lines.map((line, j) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: derived from immutable text
              <Fragment key={j}>
                {j > 0 && <br />}
                <InlineSpans spans={line} />
              </Fragment>
            ))}
          </p>
        );
    }
  });
}
