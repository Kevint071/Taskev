import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatDateTime,
  formatDueDate,
  formatDueDateForTaskChip,
  formatDueDateWithWeekday,
  formatDueRelative,
  formatRelativeTime,
} from "./format";

const now = new Date("2026-09-16T12:00:00Z");

function minutesAgo(minutes: number): Date {
  return new Date(now.getTime() - minutes * 60 * 1000);
}

test("formatRelativeTime: under a minute reads as just now", () => {
  assert.equal(formatRelativeTime(minutesAgo(0.5), now), "hace un momento");
});

test("formatRelativeTime: minutes and hours are rounded buckets", () => {
  assert.equal(formatRelativeTime(minutesAgo(5), now), "hace 5 min");
  assert.equal(formatRelativeTime(minutesAgo(90), now), "hace 2 h");
});

test("formatRelativeTime: one day back reads as 'ayer'", () => {
  assert.equal(formatRelativeTime(minutesAgo(24 * 60), now), "ayer");
});

test("formatRelativeTime: a few days back counts days", () => {
  assert.equal(formatRelativeTime(minutesAgo(3 * 24 * 60), now), "hace 3 días");
});

test("formatRelativeTime: a week or more falls back to an absolute date", () => {
  const date = minutesAgo(10 * 24 * 60);
  assert.equal(
    formatRelativeTime(date, now),
    formatDateTime(date.toISOString()),
  );
});

// Local noon on 2026-09-16: "today" is the 16th in any time zone.
const localNoon = new Date(2026, 8, 16, 12, 0, 0);

test("formatDueRelative: within a week reads as a day offset", () => {
  assert.equal(formatDueRelative("2026-09-16T00:00:00Z", localNoon), "hoy");
  assert.equal(formatDueRelative("2026-09-17T00:00:00Z", localNoon), "mañana");
  assert.equal(
    formatDueRelative("2026-09-19T00:00:00Z", localNoon),
    "en 3 días",
  );
  assert.equal(formatDueRelative("2026-09-15T00:00:00Z", localNoon), "ayer");
  assert.equal(
    formatDueRelative("2026-09-11T00:00:00Z", localNoon),
    "hace 5 días",
  );
});

test("formatDueRelative: farther than a week falls back to the date", () => {
  assert.equal(
    formatDueRelative("2026-10-20T00:00:00Z", localNoon),
    formatDueDate("2026-10-20T00:00:00Z"),
  );
  assert.equal(
    formatDueRelative("2026-08-01T00:00:00Z", localNoon),
    formatDueDate("2026-08-01T00:00:00Z"),
  );
});

test("formatDueDateForTaskChip: today and tomorrow use only relative labels", () => {
  assert.equal(
    formatDueDateForTaskChip("2026-09-16T00:00:00Z", localNoon),
    "hoy",
  );
  assert.equal(
    formatDueDateForTaskChip("2026-09-17T00:00:00Z", localNoon),
    "mañana",
  );
});

test("formatDueDateForTaskChip: other days show only the formatted date", () => {
  const date = "2026-09-19T00:00:00Z";
  assert.equal(
    formatDueDateForTaskChip(date, localNoon),
    formatDueDateWithWeekday(date),
  );
});
