import assert from "node:assert/strict";
import { test } from "node:test";
import {
  revealedChars,
  TYPING_CHARS_PER_SECOND,
  TYPING_MAX_MS,
  typedPrefix,
} from "./typewriter";

test("revealedChars: starts empty and ends with the whole text", () => {
  assert.equal(revealedChars(0, 200), 0);
  assert.equal(revealedChars(60_000, 200), 200);
});

test("revealedChars: short replies type at the base speed", () => {
  // 90 chars at 120 chars/s take 750 ms; halfway is half the text.
  assert.equal(TYPING_CHARS_PER_SECOND, 120);
  assert.equal(revealedChars(375, 90), 45);
});

test("revealedChars: long replies never take longer than the cap", () => {
  assert.equal(TYPING_MAX_MS, 6000);
  assert.equal(revealedChars(TYPING_MAX_MS, 10_000), 10_000);
  assert.equal(revealedChars(TYPING_MAX_MS / 2, 10_000), 5_000);
});

test("revealedChars: an empty text reveals nothing", () => {
  assert.equal(revealedChars(500, 0), 0);
});

test("typedPrefix: reveals whole words only", () => {
  assert.equal(typedPrefix("Hola mundo cruel", 2), "Hola");
  assert.equal(typedPrefix("Hola mundo cruel", 5), "Hola");
  assert.equal(typedPrefix("Hola mundo cruel", 6), "Hola mundo");
});

test("typedPrefix: returns the text untouched once fully revealed", () => {
  assert.equal(typedPrefix("Hola **mundo**", 14), "Hola **mundo**");
  assert.equal(typedPrefix("Hola **mundo**", 99), "Hola **mundo**");
});

test("typedPrefix: holds back a bold span until it closes", () => {
  assert.equal(typedPrefix("Tarea **muy urgente** hoy", 12), "Tarea");
  assert.equal(
    typedPrefix("Tarea **muy urgente** hoy", 21),
    "Tarea **muy urgente**",
  );
});

test("typedPrefix: holds back inline code and emphasis until they close", () => {
  assert.equal(typedPrefix("Estado `en curso` ahora", 9), "Estado");
  assert.equal(typedPrefix("Hola *ojo cuidado* fin", 7), "Hola");
  assert.equal(typedPrefix("Hola *ojo cuidado* fin", 18), "Hola *ojo cuidado*");
});

test("typedPrefix: only the line being typed is held back", () => {
  assert.equal(
    typedPrefix("Uno **listo**\nDos **muy abierto** fin", 22),
    "Uno **listo**\nDos",
  );
});

test("typedPrefix: never shows a list or heading marker on its own", () => {
  assert.equal(typedPrefix("Lista:\n- uno\n- dos", 14), "Lista:\n- uno");
  assert.equal(typedPrefix("Lista:\n1. uno", 9), "Lista:");
  assert.equal(typedPrefix("## Título", 2), "");
});

test("typedPrefix: a bullet written with an asterisk is not an open span", () => {
  assert.equal(typedPrefix("* uno dos\n* tres", 6), "* uno");
});
