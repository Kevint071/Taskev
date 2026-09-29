import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMMANDS,
  expandCommand,
  matchCommands,
  parseCommand,
} from "./commands";

const names = (draft: string) => matchCommands(draft).map((c) => c.name);

test("matchCommands lists every command for a bare slash", () => {
  assert.deepEqual(
    names("/"),
    COMMANDS.map((c) => c.name),
  );
});

test("matchCommands filters by prefix, ignoring case and accents", () => {
  assert.deepEqual(names("/cr"), ["crear"]);
  assert.deepEqual(names("/CO"), ["comentar"]);
  assert.deepEqual(names("/bloq"), ["bloqueadas"]);
});

test("matchCommands also matches the English aliases", () => {
  assert.deepEqual(names("/create"), ["crear"]);
  assert.deepEqual(names("/comm"), ["comentar"]);
});

test("matchCommands is empty once the command is followed by text", () => {
  assert.deepEqual(names("/crear "), []);
  assert.deepEqual(names("/crear conciliar"), []);
});

test("matchCommands is empty for text that is not a slash command", () => {
  assert.deepEqual(names(""), []);
  assert.deepEqual(names("hola /crear"), []);
  assert.deepEqual(names("/xyz"), []);
  assert.deepEqual(names("/etc/hosts"), []);
});

test("parseCommand splits the command from its text", () => {
  const parsed = parseCommand("/crear  conciliar openspec\ncon sugerencia ");
  assert.equal(parsed?.command.name, "crear");
  assert.equal(parsed?.args, "conciliar openspec\ncon sugerencia");
});

test("parseCommand accepts aliases and any casing", () => {
  assert.equal(parseCommand("/create algo")?.command.name, "crear");
  assert.equal(parseCommand("/CREAR algo")?.command.name, "crear");
});

test("parseCommand ignores unknown commands and plain text", () => {
  assert.equal(parseCommand("/cre algo"), null);
  assert.equal(parseCommand("/etc/hosts no abre"), null);
  assert.equal(parseCommand("crear algo"), null);
});

test("expandCommand turns /crear into instructions that keep the draft", () => {
  const prompt = expandCommand(
    "/create conciliar implementacion de openspec con nueva sugerencia",
  );
  assert.ok(prompt);
  assert.ok(
    prompt.includes(
      "«conciliar implementacion de openspec con nueva sugerencia»",
    ),
  );
  for (const part of ["create_task", "ortografía", "Descripción", "priority"]) {
    assert.ok(prompt.includes(part), `falta «${part}»`);
  }
});

test("expandCommand needs text for the commands that require it", () => {
  assert.equal(expandCommand("/crear"), null);
  assert.equal(expandCommand("/crear   "), null);
  assert.equal(expandCommand("/comentar"), null);
});

test("expandCommand works without text for the query commands", () => {
  for (const name of ["bloqueadas", "vencen", "hoy", "priorizar"]) {
    const prompt = expandCommand(`/${name}`);
    assert.ok(prompt, name);
    assert.ok(!prompt.includes("Detalle del usuario"), name);
  }
});

test("expandCommand passes extra text of a query command as context", () => {
  const prompt = expandCommand("/vencen solo Marketing");
  assert.ok(prompt?.includes("«solo Marketing»"));
});

test("expandCommand leaves ordinary messages alone", () => {
  assert.equal(expandCommand("¿Qué tareas tengo bloqueadas?"), null);
  assert.equal(expandCommand("/desconocido algo"), null);
});
