import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDateTime, formatRelativeTime } from "./format";

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
