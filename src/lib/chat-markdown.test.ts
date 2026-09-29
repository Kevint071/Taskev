import assert from "node:assert/strict";
import { test } from "node:test";
import { parseChatMarkdown, parseInline } from "./chat-markdown";

test("parseInline: plain text stays a single text span", () => {
  assert.deepEqual(parseInline("Hola"), [{ kind: "text", text: "Hola" }]);
});

test("parseInline: double asterisks and underscores become strong", () => {
  assert.deepEqual(parseInline("Tarea **FICO** y __Kaleido__"), [
    { kind: "text", text: "Tarea " },
    { kind: "strong", text: "FICO" },
    { kind: "text", text: " y " },
    { kind: "strong", text: "Kaleido" },
  ]);
});

test("parseInline: single asterisks become emphasis and backticks code", () => {
  assert.deepEqual(parseInline("*ojo* con `en_curso`"), [
    { kind: "em", text: "ojo" },
    { kind: "text", text: " con " },
    { kind: "code", text: "en_curso" },
  ]);
});

test("parseInline: unmatched markers are left as literal text", () => {
  assert.deepEqual(parseInline("5 * 3 = **15"), [
    { kind: "text", text: "5 * 3 = **15" },
  ]);
});

test("parseChatMarkdown: blank lines split paragraphs and hard breaks drop trailing spaces", () => {
  const text =
    "La siguiente tarea es:\n\n**Análisis**  \nEstado: disponible  \nProgreso: 0 %  ";
  assert.deepEqual(parseChatMarkdown(text), [
    {
      kind: "paragraph",
      lines: [[{ kind: "text", text: "La siguiente tarea es:" }]],
    },
    {
      kind: "paragraph",
      lines: [
        [{ kind: "strong", text: "Análisis" }],
        [{ kind: "text", text: "Estado: disponible" }],
        [{ kind: "text", text: "Progreso: 0 %" }],
      ],
    },
  ]);
});

test("parseChatMarkdown: consecutive bullet lines form one unordered list", () => {
  assert.deepEqual(parseChatMarkdown("Tareas:\n- Uno\n* **Dos**\n• Tres"), [
    { kind: "paragraph", lines: [[{ kind: "text", text: "Tareas:" }]] },
    {
      kind: "list",
      ordered: false,
      items: [
        { inlines: [{ kind: "text", text: "Uno" }], details: [], children: [] },
        {
          inlines: [{ kind: "strong", text: "Dos" }],
          details: [],
          children: [],
        },
        {
          inlines: [{ kind: "text", text: "Tres" }],
          details: [],
          children: [],
        },
      ],
    },
  ]);
});

test("parseChatMarkdown: numbered lines form an ordered list", () => {
  assert.deepEqual(parseChatMarkdown("1. Uno\n2) Dos"), [
    {
      kind: "list",
      ordered: true,
      items: [
        { inlines: [{ kind: "text", text: "Uno" }], details: [], children: [] },
        { inlines: [{ kind: "text", text: "Dos" }], details: [], children: [] },
      ],
    },
  ]);
});

test("parseChatMarkdown: a line of dashes is a divider, not text", () => {
  assert.deepEqual(parseChatMarkdown("Uno\n---\nDos\n\n***"), [
    { kind: "paragraph", lines: [[{ kind: "text", text: "Uno" }]] },
    { kind: "divider" },
    { kind: "paragraph", lines: [[{ kind: "text", text: "Dos" }]] },
    { kind: "divider" },
  ]);
});

test("parseChatMarkdown: headings lose their hashes and keep their level", () => {
  assert.deepEqual(parseChatMarkdown("## Pendientes\nNada hoy\n#### Mañana"), [
    {
      kind: "heading",
      level: 2,
      inlines: [{ kind: "text", text: "Pendientes" }],
    },
    { kind: "paragraph", lines: [[{ kind: "text", text: "Nada hoy" }]] },
    { kind: "heading", level: 4, inlines: [{ kind: "text", text: "Mañana" }] },
  ]);
});

test("parseChatMarkdown: indented items nest under the previous item", () => {
  const text =
    "1. **Pipeline**\n   - Estado: en_curso\n   * Prioridad: 5\n2. **Kaleido**\n    - Estado: bloqueada";
  assert.deepEqual(parseChatMarkdown(text), [
    {
      kind: "list",
      ordered: true,
      items: [
        {
          inlines: [{ kind: "strong", text: "Pipeline" }],
          details: [],
          children: [
            [{ kind: "text", text: "Estado: en_curso" }],
            [{ kind: "text", text: "Prioridad: 5" }],
          ],
        },
        {
          inlines: [{ kind: "strong", text: "Kaleido" }],
          details: [],
          children: [[{ kind: "text", text: "Estado: bloqueada" }]],
        },
      ],
    },
  ]);
});

test("parseChatMarkdown: an indented item with no parent starts the list", () => {
  assert.deepEqual(parseChatMarkdown("  - Uno"), [
    {
      kind: "list",
      ordered: false,
      items: [
        { inlines: [{ kind: "text", text: "Uno" }], details: [], children: [] },
      ],
    },
  ]);
});

test("parseChatMarkdown: text after a bold title and a dash moves to its own line", () => {
  const text =
    "- **Mandar caso** – creaste esta tarea.\n- **Migrar Redis** — cambiaste a **en_curso** hoy\n- **Sin guion** y más texto\n- **Guion pegado**-sin espacios";
  assert.deepEqual(parseChatMarkdown(text), [
    {
      kind: "list",
      ordered: false,
      items: [
        {
          inlines: [{ kind: "strong", text: "Mandar caso" }],
          details: [[{ kind: "text", text: "creaste esta tarea." }]],
          children: [],
        },
        {
          inlines: [{ kind: "strong", text: "Migrar Redis" }],
          details: [
            [
              { kind: "text", text: "cambiaste a " },
              { kind: "strong", text: "en_curso" },
              { kind: "text", text: " hoy" },
            ],
          ],
          children: [],
        },
        {
          inlines: [
            { kind: "strong", text: "Sin guion" },
            { kind: "text", text: " y más texto" },
          ],
          details: [],
          children: [],
        },
        {
          inlines: [
            { kind: "strong", text: "Guion pegado" },
            { kind: "text", text: "-sin espacios" },
          ],
          details: [],
          children: [],
        },
      ],
    },
  ]);
});

test("parseChatMarkdown: a dash that is not right after the bold title is left alone", () => {
  assert.deepEqual(parseChatMarkdown("- Hoy creaste **algo** – bien"), [
    {
      kind: "list",
      ordered: false,
      items: [
        {
          inlines: [
            { kind: "text", text: "Hoy creaste " },
            { kind: "strong", text: "algo" },
            { kind: "text", text: " – bien" },
          ],
          details: [],
          children: [],
        },
      ],
    },
  ]);
});

test("parseChatMarkdown: indented lines under an item are its detail lines", () => {
  const text =
    "1. **Pipeline**\n   En curso, 30 %.\n   Vence mañana.\n2. **Kaleido**\n  Bloqueada\n\nY después, ¿qué?";
  assert.deepEqual(parseChatMarkdown(text), [
    {
      kind: "list",
      ordered: true,
      items: [
        {
          inlines: [{ kind: "strong", text: "Pipeline" }],
          details: [
            [{ kind: "text", text: "En curso, 30 %." }],
            [{ kind: "text", text: "Vence mañana." }],
          ],
          children: [],
        },
        {
          inlines: [{ kind: "strong", text: "Kaleido" }],
          details: [[{ kind: "text", text: "Bloqueada" }]],
          children: [],
        },
      ],
    },
    {
      kind: "paragraph",
      lines: [[{ kind: "text", text: "Y después, ¿qué?" }]],
    },
  ]);
});

test("parseChatMarkdown: a plain line right under an item is its detail even without indent", () => {
  const text =
    "- **Probar App CD**\nComentaste a las 21:03.\nAntes, otro comentario.\n- **Mandar caso**\nCreaste esta tarea.";
  assert.deepEqual(parseChatMarkdown(text), [
    {
      kind: "list",
      ordered: false,
      items: [
        {
          inlines: [{ kind: "strong", text: "Probar App CD" }],
          details: [
            [{ kind: "text", text: "Comentaste a las 21:03." }],
            [{ kind: "text", text: "Antes, otro comentario." }],
          ],
          children: [],
        },
        {
          inlines: [{ kind: "strong", text: "Mandar caso" }],
          details: [[{ kind: "text", text: "Creaste esta tarea." }]],
          children: [],
        },
      ],
    },
  ]);
});

test("parseChatMarkdown: a blank line ends the list, so a closing paragraph stays apart", () => {
  assert.deepEqual(parseChatMarkdown("- **Uno**\n- **Dos**\n\n¿Seguimos?"), [
    {
      kind: "list",
      ordered: false,
      items: [
        {
          inlines: [{ kind: "strong", text: "Uno" }],
          details: [],
          children: [],
        },
        {
          inlines: [{ kind: "strong", text: "Dos" }],
          details: [],
          children: [],
        },
      ],
    },
    { kind: "paragraph", lines: [[{ kind: "text", text: "¿Seguimos?" }]] },
  ]);
});

test("parseChatMarkdown: an indented line outside a list stays a paragraph", () => {
  assert.deepEqual(parseChatMarkdown("Hola\n   sigue"), [
    {
      kind: "paragraph",
      lines: [
        [{ kind: "text", text: "Hola" }],
        [{ kind: "text", text: "sigue" }],
      ],
    },
  ]);
});

test("parseInline: narrow no-break spaces render as regular-width ones", () => {
  assert.deepEqual(parseInline("4 de octubre"), [
    { kind: "text", text: "4 de octubre" },
  ]);
});
