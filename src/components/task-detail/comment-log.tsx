import { useState } from "react";
import type { TaskComment } from "@/components/group-types";
import { groupCommentsByDay } from "@/lib/comment-log";
import { formatTime } from "@/lib/format";
import { isTempId } from "@/lib/sync-queue";

// The log opens on its latest entries; the rest unfold on demand.
const LOG_PREVIEW_COUNT = 3;

/** The task's log, newest first, grouped by day. */
export function CommentLog({ comments }: { comments: TaskComment[] }) {
  const [showAll, setShowAll] = useState(false);

  // Newest first, so the latest entry is the first thing under the heading.
  const newestFirst = [...comments].reverse();
  const hiddenCount = Math.max(0, newestFirst.length - LOG_PREVIEW_COUNT);
  const visible = showAll
    ? newestFirst
    : newestFirst.slice(0, LOG_PREVIEW_COUNT);
  const groups = groupCommentsByDay(visible);

  return (
    <section className="mt-3 flex flex-col gap-4" aria-label="Bitácora">
      <h2 className="text-[15px] font-semibold">
        Bitácora
        {comments.length > 0 && (
          <span className="tabular ml-1.5 font-normal text-muted">
            {comments.length}
          </span>
        )}
      </h2>
      {comments.length === 0 && (
        <p className="text-ui text-muted">
          Aún no hay entradas. Anota aquí qué avanzó o qué cambió.
        </p>
      )}
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-3">
          <p className="text-meta font-medium text-muted first-letter:uppercase">
            {group.label}
          </p>
          <ol className="ml-0.75 flex flex-col gap-4 border-l border-line pl-4">
            {group.items.map((c) => (
              <li
                key={c.id}
                className={`relative ${isTempId(c.id) ? "opacity-70" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className="absolute top-2 left-[-19.5px] size-1.75 rounded-full bg-line-strong"
                />
                <time
                  dateTime={c.createdAt}
                  className="tabular block text-meta text-muted"
                >
                  {formatTime(c.createdAt)}
                </time>
                <p className="text-[15px] leading-6 wrap-break-word whitespace-pre-wrap">
                  {c.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          aria-expanded={showAll}
          onClick={() => setShowAll((s) => !s)}
          className="-ml-2 inline-flex h-9 w-fit items-center rounded-full px-3 text-ui font-medium text-accent transition-colors hover:bg-accent-soft"
        >
          {showAll
            ? "Mostrar menos"
            : `Ver ${hiddenCount} ${hiddenCount === 1 ? "anterior" : "anteriores"}`}
        </button>
      )}
    </section>
  );
}
