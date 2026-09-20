import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDaysUtc,
  addMonths,
  buildMonthGrid,
  daysBetweenUtc,
  isSameUtcDay,
  nextMondayUtc,
  utcMidnight,
} from "./calendar";

test("buildMonthGrid returns full Monday-first weeks covering the month", () => {
  const grid = buildMonthGrid(2026, 8); // September 2026
  assert.equal(grid.length % 7, 0);
  assert.equal(grid[0].date.getUTCDay(), 1); // Monday
  assert.equal(grid.at(-1)?.date.getUTCDay(), 0); // Sunday

  const inMonthDays = grid.filter((d) => d.inMonth);
  assert.equal(inMonthDays.length, 30);
  assert.equal(inMonthDays[0].day, 1);
  assert.equal(inMonthDays.at(-1)?.day, 30);
  for (const d of inMonthDays) assert.equal(d.date.getUTCMonth(), 8);
});

test("addMonths rolls over year boundaries", () => {
  assert.deepEqual(addMonths(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(addMonths(2026, 0, -1), { year: 2025, month: 11 });
  assert.deepEqual(addMonths(2026, 5, 0), { year: 2026, month: 5 });
});

test("isSameUtcDay compares calendar day, not time", () => {
  assert.equal(
    isSameUtcDay(utcMidnight(2026, 8, 17), new Date(Date.UTC(2026, 8, 17, 23))),
    true,
  );
  assert.equal(
    isSameUtcDay(utcMidnight(2026, 8, 17), utcMidnight(2026, 8, 18)),
    false,
  );
});

test("addDaysUtc adds calendar days across month boundaries", () => {
  const result = addDaysUtc(utcMidnight(2026, 8, 29), 3);
  assert.equal(isSameUtcDay(result, utcMidnight(2026, 9, 2)), true);
});

test("daysBetweenUtc counts whole calendar days, signed", () => {
  const from = utcMidnight(2026, 8, 19);
  assert.equal(daysBetweenUtc(utcMidnight(2026, 8, 24), from), 5);
  assert.equal(daysBetweenUtc(from, from), 0);
  assert.equal(daysBetweenUtc(utcMidnight(2026, 8, 17), from), -2);
});

test("nextMondayUtc is always strictly after the given day", () => {
  // Sat 19 Sep 2026 -> Mon 21 Sep; Mon 21 -> Mon 28; Sun 20 -> Mon 21
  assert.equal(
    isSameUtcDay(
      nextMondayUtc(utcMidnight(2026, 8, 19)),
      utcMidnight(2026, 8, 21),
    ),
    true,
  );
  assert.equal(
    isSameUtcDay(
      nextMondayUtc(utcMidnight(2026, 8, 21)),
      utcMidnight(2026, 8, 28),
    ),
    true,
  );
  assert.equal(
    isSameUtcDay(
      nextMondayUtc(utcMidnight(2026, 8, 20)),
      utcMidnight(2026, 8, 21),
    ),
    true,
  );
});
