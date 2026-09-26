import assert from "node:assert/strict";
import { test } from "node:test";
import { dayKeyInTimeZone } from "./time-zone";

// 01:44 UTC on Sep 27 is still 8:44 pm on Sep 26 in Bogotá (UTC-5).
const evening = new Date("2026-09-27T01:44:00Z");

test("uses the viewer's calendar day, not the server's UTC day", () => {
  assert.equal(
    dayKeyInTimeZone(evening, "America/Bogota"),
    Date.UTC(2026, 8, 26),
  );
  assert.equal(dayKeyInTimeZone(evening, "UTC"), Date.UTC(2026, 8, 27));
});

test("zones ahead of UTC can already be on the next day", () => {
  const lateUtc = new Date("2026-09-26T20:00:00Z");
  assert.equal(
    dayKeyInTimeZone(lateUtc, "Pacific/Auckland"),
    Date.UTC(2026, 8, 27),
  );
});

test("falls back to the process's zone without a usable zone", () => {
  const local = Date.UTC(
    evening.getFullYear(),
    evening.getMonth(),
    evening.getDate(),
  );
  assert.equal(dayKeyInTimeZone(evening), local);
  assert.equal(dayKeyInTimeZone(evening, "Not/AZone"), local);
});
