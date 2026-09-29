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

test("lists the next week's dates with their weekday so the model never computes them", () => {
  const text = buildSystemInstruction(evening, "America/Bogota");
  // Today in Bogotá is Saturday Sep 26; the list runs through Saturday Oct 3.
  assert.match(text, /- mañana: domingo 27 de septiembre \(2026-09-27\)/);
  assert.match(text, /- miércoles 30 de septiembre \(2026-09-30\)/);
  assert.match(text, /- sábado 3 de octubre \(2026-10-03\)/);
  assert.doesNotMatch(text, /2026-10-04/);
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
  // The app calls comments "bitácora"; the model must map one to the other.
  assert.match(text, /bitácora/);
  assert.match(text, /aclar/i);
  // Task content is data, never instructions.
  assert.match(text, /datos/);
  assert.match(text, /instrucciones/);
});

test("asks for proactive, Markdown-formatted replies the chat can render", () => {
  const text = buildSystemInstruction(evening, "UTC");
  assert.match(text, /proactivo/);
  assert.match(text, /recomienda/);
  assert.match(text, /Markdown/);
  assert.doesNotMatch(text, /sin Markdown|texto plano/);
  // The chat renderer has no table support.
  assert.match(text, /No uses [^.]*tablas/);
  // A task's fields go on one line, not one bullet each.
  assert.match(text, /Nunca pongas en viñetas los datos de una tarea/);
  // A long flat list of tasks should break into grouped subheadings instead.
  assert.match(text, /subtítulos/);
  assert.match(text, /agrúpalas/);
  // Title and detail sit on separate lines instead of joined by a dash.
  assert.match(text, /detalle en la línea siguiente/);
  assert.match(text, /No unas el título y el detalle en la misma línea/);
  assert.match(text, /sin línea en blanco entre ambos/);
  assert.match(text, /Separa las ideas en párrafos distintos/);
});

test("tells the model 'pendientes' spans every status but completada", () => {
  const text = buildSystemInstruction(evening, "UTC");
  assert.match(text, /pendiente/);
  assert.match(text, /excludeCompleted/);
});
