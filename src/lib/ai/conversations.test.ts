import assert from "node:assert/strict";
import { test } from "node:test";
import {
  captureModelTitle,
  cleanModelTitle,
  groupByRecency,
  MAX_TITLE_LENGTH,
  parseTitle,
  pickProvider,
  TITLE_PREVIEW,
  takeTitleMarker,
  titleFromMessage,
} from "./conversations";
import type { GenerateResult, HistoryStep } from "./provider";

test("titleFromMessage collapses spacing and drops the question marks", () => {
  assert.equal(
    titleFromMessage("  ¿Qué  tareas\ntengo\tbloqueadas? "),
    "Tareas bloqueadas",
  );
});

test('titleFromMessage turns "qué X tengo/hay …" into a noun phrase', () => {
  assert.equal(
    titleFromMessage("¿qué tareas urgentes tengo en Marketing?"),
    "Tareas urgentes en Marketing",
  );
  assert.equal(
    titleFromMessage("cuales tareas hay bloqueadas"),
    "Tareas bloqueadas",
  );
  // Without a noun after the verb there is nothing to rewrite.
  assert.equal(titleFromMessage("¿Qué tareas tengo?"), "Qué tareas tengo");
});

test("titleFromMessage drops greetings, courtesy and request openers", () => {
  assert.equal(
    titleFromMessage("Hola, ¿puedes decirme qué vence esta semana por favor?"),
    "Qué vence esta semana",
  );
  assert.equal(
    titleFromMessage(
      "buenas tardes, quiero que me digas qué tareas vencen hoy",
    ),
    "Qué tareas vencen hoy",
  );
  assert.equal(
    titleFromMessage("Necesito saber qué está bloqueado, gracias"),
    "Qué está bloqueado",
  );
  assert.equal(
    titleFromMessage("ayúdame a priorizar mi lista"),
    "Priorizar mi lista",
  );
});

test("titleFromMessage keeps only the first sentence, capitalised", () => {
  assert.equal(
    titleFromMessage(
      "Por favor, necesito organizar mi semana. Tengo 5 reuniones y poco tiempo.",
    ),
    "Organizar mi semana",
  );
  assert.equal(
    titleFromMessage("quiero crear una tarea para revisar el informe"),
    "Crear una tarea para revisar el informe",
  );
});

test("titleFromMessage keeps a too-short first sentence with the next one", () => {
  assert.equal(
    titleFromMessage("Ok. Revisa las tareas de Marketing"),
    "Ok. Revisa las tareas de Marketing",
  );
});

test("titleFromMessage keeps the message when cleaning would empty it", () => {
  assert.equal(titleFromMessage("Hola"), "Hola");
  assert.equal(titleFromMessage("por favor"), "Por favor");
});

test("titleFromMessage names slash commands by what they do", () => {
  assert.equal(
    titleFromMessage("/crear  comprar leche para el desayuno"),
    "Crear tarea: Comprar leche para el desayuno",
  );
  assert.equal(
    titleFromMessage("/comment revisar el informe de ventas"),
    "Comentar tarea: Revisar el informe de ventas",
  );
  assert.equal(titleFromMessage("/bloqueadas"), "Tareas bloqueadas");
  assert.equal(
    titleFromMessage("/vencen marketing"),
    "Qué vence pronto: Marketing",
  );
  assert.equal(titleFromMessage("/crear"), "Crear tarea");
  // Not a command: it stays as typed.
  assert.equal(titleFromMessage("/desconocido algo"), "/desconocido algo");
});

test("titleFromMessage cuts a long message at a word, never on a dangling one", () => {
  const title = titleFromMessage(
    "¿Qué tareas de Marketing vencen esta semana y cuáles están bloqueadas desde el lunes?",
  );
  assert.equal(
    title,
    "Qué tareas de Marketing vencen esta semana y cuáles están…",
  );
  assert.ok(title.length <= TITLE_PREVIEW + 1);

  const article = titleFromMessage(
    "Revisar los informes de ventas del trimestre pasado con el equipo de finanzas",
  );
  assert.ok(!/\s(de|del|la|el|los|con|y)…$/.test(article), article);
  assert.ok(article.endsWith("…"));
});

test("titleFromMessage cuts a single long word mid-word", () => {
  const title = titleFromMessage("a".repeat(TITLE_PREVIEW * 2));
  assert.equal(title, `A${"a".repeat(TITLE_PREVIEW - 1)}…`);
});

test("titleFromMessage falls back when the message has no text", () => {
  assert.equal(titleFromMessage("   "), "Nueva conversación");
  assert.equal(titleFromMessage("¿?"), "Nueva conversación");
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

test("groupByRecency buckets by local calendar day and keeps the order", () => {
  const now = new Date(2026, 8, 29, 10, 0);
  const at = (day: number, hour = 12) =>
    new Date(2026, 8, day, hour).toISOString();
  const items = [
    { id: "a", updatedAt: at(29, 9) },
    { id: "b", updatedAt: at(28, 23) },
    { id: "c", updatedAt: at(25) },
    { id: "d", updatedAt: at(22) },
    { id: "e", updatedAt: at(1) },
  ];
  assert.deepEqual(
    groupByRecency(items, now).map((g) => [g.label, g.items.map((i) => i.id)]),
    [
      ["Hoy", ["a"]],
      ["Ayer", ["b"]],
      ["Últimos 7 días", ["c", "d"]],
      ["Anteriores", ["e"]],
    ],
  );
});

test("groupByRecency skips empty groups", () => {
  const now = new Date(2026, 8, 29, 10, 0);
  const groups = groupByRecency(
    [{ id: "a", updatedAt: new Date(2026, 5, 1).toISOString() }],
    now,
  );
  assert.deepEqual(
    groups.map((g) => g.label),
    ["Anteriores"],
  );
  assert.deepEqual(groupByRecency([], now), []);
});

test("titleFromMessage drops small talk and trailing urgency phrases", () => {
  assert.equal(
    titleFromMessage(
      "Hola como te va, necesito ver las primeras cosas que necesiten ser atendidas lo mas pronto",
    ),
    "Primeras cosas que necesiten ser atendidas",
  );
  assert.equal(
    titleFromMessage("hola, qué tal, quiero ver mis tareas de hoy"),
    "Mis tareas de hoy",
  );
  assert.equal(
    titleFromMessage("Necesito las tareas más urgentes lo antes posible"),
    "Tareas más urgentes",
  );
  assert.equal(
    titleFromMessage("quiero que me listes las tareas bloqueadas"),
    "Tareas bloqueadas",
  );
});

test("titleFromMessage keeps a lone article-noun and command arguments as typed", () => {
  assert.equal(titleFromMessage("las tareas"), "Las tareas");
  assert.equal(
    titleFromMessage("/crear el informe mensual"),
    "Crear tarea: El informe mensual",
  );
});

test("cleanModelTitle tidies what a model returns", () => {
  assert.equal(
    cleanModelTitle('  "tareas bloqueadas."  '),
    "Tareas bloqueadas",
  );
  assert.equal(cleanModelTitle("«Prioridades de hoy»"), "Prioridades de hoy");
  assert.equal(
    cleanModelTitle("**Revisión del informe**"),
    "Revisión del informe",
  );
  assert.equal(
    cleanModelTitle("Título: Tareas de Marketing"),
    "Tareas de Marketing",
  );
  const long = cleanModelTitle("palabra ".repeat(30));
  assert.ok(long && long.length <= TITLE_PREVIEW + 1);
});

test("cleanModelTitle rejects titles that are not usable", () => {
  assert.equal(cleanModelTitle(""), null);
  assert.equal(cleanModelTitle("  "), null);
  assert.equal(cleanModelTitle("ok"), null);
  assert.equal(cleanModelTitle("<resumen del tema>"), null);
  assert.equal(cleanModelTitle("..."), null);
});

test("takeTitleMarker removes the marker everywhere and returns the title", () => {
  const taken = takeTitleMarker({
    text: "Tienes 2 tareas bloqueadas.\n\n[título: Tareas bloqueadas]",
    steps: [
      {
        type: "model_output",
        content: [
          {
            type: "text",
            text: "Tienes 2 tareas bloqueadas.\n[Título: Tareas bloqueadas]",
          },
        ],
      },
    ],
  });
  assert.equal(taken.title, "Tareas bloqueadas");
  assert.equal(taken.value.text, "Tienes 2 tareas bloqueadas.");
  assert.deepEqual(taken.value.steps, [
    {
      type: "model_output",
      content: [{ type: "text", text: "Tienes 2 tareas bloqueadas." }],
    },
  ]);
});

test("takeTitleMarker tolerates a sloppy marker and leaves other text alone", () => {
  assert.equal(
    takeTitleMarker("Hecho.\n[[titulo: Crear una tarea").value,
    "Hecho.",
  );
  assert.equal(
    takeTitleMarker("Hecho.\n[[titulo: Crear una tarea").title,
    "Crear una tarea",
  );
  const plain = takeTitleMarker({ text: "Sin marca [1] aquí", n: 3, ok: true });
  assert.equal(plain.title, null);
  assert.deepEqual(plain.value, { text: "Sin marca [1] aquí", n: 3, ok: true });
  // A marker whose title is unusable is still removed from what the user sees.
  const empty = takeTitleMarker("Hola.\n[título: ]");
  assert.equal(empty.title, null);
  assert.equal(empty.value, "Hola.");
});

test("captureModelTitle cleans every generate result and keeps the first title", async () => {
  const results: GenerateResult[] = [
    {
      steps: [],
      text: "Reviso tus tareas…",
      calls: [{ id: "1", name: "x", args: {} }],
    },
    {
      steps: [
        { type: "model_output", text: "Listo.\n[título: Tareas de hoy]" },
      ],
      text: "Listo.\n[título: Tareas de hoy]",
      calls: [],
    },
    { steps: [], text: "Otra.\n[título: Segundo]", calls: [] },
  ];
  const seen: HistoryStep[][] = [];
  const capture = captureModelTitle(async (history) => {
    seen.push(history);
    return results[seen.length - 1];
  });
  assert.equal(capture.title(), null);
  const first = await capture.generate([]);
  assert.equal(first.text, "Reviso tus tareas…");
  assert.equal(capture.title(), null);
  const second = await capture.generate([]);
  assert.equal(second.text, "Listo.");
  assert.deepEqual(second.steps, [{ type: "model_output", text: "Listo." }]);
  await capture.generate([]);
  assert.equal(capture.title(), "Tareas de hoy");
});

test("captureModelTitle passes provider errors through", async () => {
  const capture = captureModelTitle(async () => {
    throw new Error("boom");
  });
  await assert.rejects(() => capture.generate([]), /boom/);
  assert.equal(capture.title(), null);
});
