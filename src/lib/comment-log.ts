import type { TaskComment } from "@/components/group-types";
import { formatLongDate } from "./format";

export type CommentDayGroup = {
  key: string;
  label: string;
  items: TaskComment[];
};

/** "Hoy", "Ayer", or the full weekday and date. */
export function dayLabel(d: Date, now = new Date()): string {
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return formatLongDate(d);
}

/** Groups consecutive comments under one heading per calendar day, in the order given. */
export function groupCommentsByDay(comments: TaskComment[]): CommentDayGroup[] {
  const groups: CommentDayGroup[] = [];
  for (const c of comments) {
    const d = new Date(c.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.items.push(c);
    } else {
      groups.push({ key, label: dayLabel(d), items: [c] });
    }
  }
  return groups;
}
