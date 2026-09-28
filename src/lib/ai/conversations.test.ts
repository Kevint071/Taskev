import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_TITLE_LENGTH,
  parseTitle,
  pickProvider,
  TITLE_PREVIEW,
  titleFromMessage,
} from "./conversations";

test("titleFromMessage keeps a short message, with its spacing collapsed", () => {
  assert.equal(
    titleFromMessage("  ¿Qué  tareas\ntengo\tbloqueadas? "),
    "¿Qué tareas tengo bloqueadas?",
  );
});

test("titleFromMessage cuts a long message at a word boundary", () => {
  const title = titleFromMessage(
    "¿Qué tareas de Marketing vencen esta semana y cuáles están bloqueadas desde el lunes?",
  );
  assert.equal(
    title,
    "¿Qué tareas de Marketing vencen esta semana y cuáles están…",
  );
  assert.ok(title.length <= TITLE_PREVIEW + 1);
});

test("titleFromMessage cuts a single long word mid-word", () => {
  const title = titleFromMessage("a".repeat(TITLE_PREVIEW * 2));
  assert.equal(title, `${"a".repeat(TITLE_PREVIEW)}…`);
});

test("titleFromMessage falls back when the message has no text", () => {
  assert.equal(titleFromMessage("   "), "Nueva conversación");
});

test("parseTitle trims and accepts 1 to 100 characters", () => {
  assert.deepEqual(parseTitle("  Planificación Q4 "), {
    ok: true,
    title: "Planificación Q4",
  });
  assert.deepEqual(parseTitle("x".repeat(MAX_TITLE_LENGTH)), {
    ok: true,
    title: "x".repeat(MAX_TITLE_LENGTH),
  });
});

test("parseTitle rejects empty, blank, too long and non-string titles", () => {
  for (const raw of ["", "   ", "x".repeat(MAX_TITLE_LENGTH + 1), 42, null]) {
    const parsed = parseTitle(raw);
    assert.equal(parsed.ok, false, String(raw));
  }
  assert.deepEqual(parseTitle(" "), {
    ok: false,
    error: "El título no puede estar vacío",
  });
});

test("pickProvider returns the first candidate that is configured", () => {
  assert.equal(pickProvider(["groq", "gemini"], ["gemini", "groq"]), "groq");
  assert.equal(pickProvider([null, "groq"], ["gemini", "groq"]), "groq");
});

test("pickProvider falls back to a configured provider, or null", () => {
  assert.equal(pickProvider(["groq"], ["gemini"]), "gemini");
  assert.equal(pickProvider([], ["gemini", "groq"]), "gemini");
  assert.equal(pickProvider([undefined], ["groq"]), "groq");
  assert.equal(pickProvider(["gemini"], []), null);
});
