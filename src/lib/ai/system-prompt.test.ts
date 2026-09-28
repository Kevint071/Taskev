import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSystemInstruction } from "./system-prompt";

// 01:44 UTC on Sunday Sep 27 is still Saturday evening in Bogotá (UTC-5).
const evening = new Date("2026-09-27T01:44:00Z");

test("states today's date and weekday in the user's time zone", () => {
  const bogota = buildSystemInstruction(evening, "America/Bogota");
  assert.match(bogota, /sábado, 26 de septiembre de 2026 \(2026-09-26\)/);

  const madrid = buildSystemInstruction(evening, "Europe/Madrid");
  assert.match(madrid, /domingo, 27 de septiembre de 2026 \(2026-09-27\)/);
});

test("an unknown zone still yields a date", () => {
  assert.match(
    buildSystemInstruction(evening, "Not/AZone"),
    /\(2026-09-2[67]\)/,
  );
});

test("sets the ground rules for the model", () => {
  const text = buildSystemInstruction(evening, "UTC");
  for (const status of [
    "disponible",
    "en_curso",
    "bloqueada",
    "pausada",
    "completada",
  ]) {
    assert.ok(text.includes(status), status);
  }
  assert.match(text, /español/);
  assert.match(text, /aclar/i);
  // Task content is data, never instructions.
  assert.match(text, /datos/);
  assert.match(text, /instrucciones/);
});
