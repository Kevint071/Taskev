import assert from "node:assert/strict";
import { test } from "node:test";
import {
  confirmationSummary,
  DESTRUCTIVE_TOOLS,
  filterTasks,
  isDestructive,
  LIST_TASKS_LIMIT,
  parseDateArg,
  parseListTasksArgs,
  parseTaskArgs,
  type TaskLike,
  TOOL_DECLARATIONS,
} from "./tools";

const GROUP = "4f11b7ce-0b36-4761-bdff-3a46f85de9d5";
const OTHER_GROUP = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const TASK = "d1755822-b598-4f13-95d4-e539d3eac101";

test("dates arrive as YYYY-MM-DD and become UTC midnight", () => {
  assert.equal(
    parseDateArg("2026-10-02")?.toISOString(),
    "2026-10-02T00:00:00.000Z",
  );
  assert.equal(parseDateArg(null), null);
  assert.equal(parseDateArg(""), null);
});

test("malformed or impossible dates are rejected", () => {
  for (const raw of [
    "2026-02-30",
    "2026-13-01",
    "02/10/2026",
    "2026-10-02T10:00:00Z",
    "viernes",
    42,
  ]) {
    assert.equal(parseDateArg(raw), undefined, String(raw));
  }
});

test("create_task needs a group and a title and converts dates", () => {
  const parsed = parseTaskArgs(
    {
      groupId: GROUP,
      title: "Enviar factura",
      dueDate: "2026-10-02",
      status: "en_curso",
      progressPct: 20,
    },
    "create",
  );
  assert.ok(parsed.ok);
  assert.equal(parsed.value.id, GROUP);
  assert.equal(parsed.value.body.title, "Enviar factura");
  assert.equal(parsed.value.body.status, "en_curso");
  assert.equal(parsed.value.body.progressPct, 20);
  assert.equal(
    (parsed.value.body.dueDate as Date).toISOString(),
    "2026-10-02T00:00:00.000Z",
  );

  assert.equal(parseTaskArgs({ title: "Sin grupo" }, "create").ok, false);
});

test("update_task only sends the fields present", () => {
  const parsed = parseTaskArgs(
    {
      taskId: TASK,
      status: "completada",
      progressPct: 100,
      completedDate: "2026-09-28",
    },
    "update",
  );
  assert.ok(parsed.ok);
  assert.equal(parsed.value.id, TASK);
  assert.deepEqual(Object.keys(parsed.value.body).sort(), [
    "completedAt",
    "progressPct",
    "status",
  ]);
  assert.equal(
    (parsed.value.body.completedAt as Date).toISOString(),
    "2026-09-28T00:00:00.000Z",
  );
  const cleared = parseTaskArgs({ taskId: TASK, dueDate: "" }, "update");
  assert.ok(cleared.ok);
  assert.equal(cleared.value.body.dueDate, null);
});

test("invalid statuses and dates are rejected with a usable message", () => {
  const status = parseTaskArgs({ taskId: TASK, status: "hecha" }, "update");
  assert.equal(status.ok, false);
  assert.match(!status.ok ? status.error : "", /Estado inválido.*en_curso/);

  const date = parseTaskArgs({ taskId: TASK, dueDate: "el viernes" }, "update");
  assert.equal(date.ok, false);
  assert.match(!date.ok ? date.error : "", /YYYY-MM-DD/);
});

test("list_tasks validates its filters", () => {
  assert.deepEqual(parseListTasksArgs({}), { ok: true, value: {} });
  const parsed = parseListTasksArgs({
    groupId: GROUP,
    status: "bloqueada",
    query: "  factura ",
    dueBefore: "2026-10-04",
  });
  assert.ok(parsed.ok);
  assert.equal(parsed.value.groupId, GROUP);
  assert.equal(parsed.value.status, "bloqueada");
  assert.equal(parsed.value.query, "factura");
  assert.equal(
    parsed.value.dueBefore?.toISOString(),
    "2026-10-04T00:00:00.000Z",
  );
  assert.equal(parseListTasksArgs({ status: "hecha" }).ok, false);
  assert.equal(parseListTasksArgs({ dueBefore: "mañana" }).ok, false);

  const excluding = parseListTasksArgs({ excludeCompleted: true });
  assert.ok(excluding.ok);
  assert.equal(excluding.value.excludeCompleted, true);
  // A non-boolean value is ignored rather than rejected.
  assert.deepEqual(parseListTasksArgs({ excludeCompleted: "sí" }), {
    ok: true,
    value: {},
  });
});

function task(overrides: Partial<TaskLike>): TaskLike {
  return {
    id: TASK,
    groupId: GROUP,
    groupName: "Finanzas",
    title: "Tarea",
    description: null,
    status: "disponible",
    progressPct: 0,
    priority: "0",
    dueDate: null,
    completedAt: null,
    pinnedToday: false,
    ...overrides,
  };
}

test("list_tasks filters by group, status, text and due date", () => {
  const tasks = [
    task({
      id: "a",
      title: "Enviar factura",
      status: "bloqueada",
      dueDate: new Date("2026-10-02T00:00:00Z"),
    }),
    task({
      id: "b",
      title: "Revisar gastos",
      description: "Incluye la FACTURA de luz",
      dueDate: new Date("2026-10-04T00:00:00Z"),
    }),
    task({
      id: "c",
      title: "Campaña",
      groupId: OTHER_GROUP,
      groupName: "Marketing",
      dueDate: new Date("2026-10-05T00:00:00Z"),
    }),
    task({ id: "d", title: "Sin fecha" }),
  ];
  const ids = (filter: Parameters<typeof filterTasks>[1]) =>
    filterTasks(tasks, filter).tasks.map((t) => t.id);

  assert.deepEqual(ids({}), ["a", "b", "c", "d"]);
  assert.deepEqual(ids({ groupId: OTHER_GROUP }), ["c"]);
  assert.deepEqual(ids({ status: "bloqueada" }), ["a"]);
  // Case- and accent-insensitive, over title and description.
  assert.deepEqual(ids({ query: "factura" }), ["a", "b"]);
  assert.deepEqual(ids({ query: "campana" }), ["c"]);
  // Due on or before the given day; tasks without a due date are left out.
  assert.deepEqual(ids({ dueBefore: new Date("2026-10-04T00:00:00Z") }), [
    "a",
    "b",
  ]);
});

test("list_tasks with excludeCompleted keeps every status except completada", () => {
  const tasks = [
    task({ id: "a", status: "disponible" }),
    task({ id: "b", status: "en_curso" }),
    task({ id: "c", status: "bloqueada" }),
    task({ id: "d", status: "pausada" }),
    task({ id: "e", status: "completada" }),
  ];
  const ids = filterTasks(tasks, { excludeCompleted: true }).tasks.map(
    (t) => t.id,
  );
  assert.deepEqual(ids, ["a", "b", "c", "d"]);
});

test("list_tasks query matches every word in any order", () => {
  const tasks = [
    task({ id: "a", title: "Cerrar ticket de Kaleido de respuesta de SSL" }),
    task({ id: "b", title: "Renovar certificado", description: "Kaleido SSL" }),
    task({ id: "c", title: "Ticket de otra cosa" }),
  ];
  const ids = (query: string) =>
    filterTasks(tasks, { query }).tasks.map((t) => t.id);

  assert.deepEqual(ids("kaleido ticket"), ["a"]);
  assert.deepEqual(ids("SSL  kaleido"), ["a", "b"]);
  // A phrase in order still matches.
  assert.deepEqual(ids("ticket de Kaleido"), ["a"]);
  // Nothing in common at all is still no match.
  assert.deepEqual(ids("factura presupuesto"), []);
  assert.equal(
    filterTasks(tasks, { query: "kaleido ticket" }).partialMatch,
    false,
  );
});

test("list_tasks query falls back to the best partial matches", () => {
  const tasks = [
    task({ id: "x", title: "Revisar app CD de Boris" }),
    task({
      id: "a",
      title:
        "Comparar implementación de mejoras de app CD con las del repo true.spec de Boris",
      description: "Cambios pendientes",
    }),
    task({ id: "b", title: "Cerrar ticket de Kaleido" }),
    task({ id: "c", title: "Enviar factura", description: "app" }),
  ];
  const result = filterTasks(tasks, {
    query: "conciliar cambios app cd Boris",
  });

  // "conciliar" appears nowhere, but 4 of the 5 words do in "a" and 3 in "x".
  // Best match first; a task matching fewer than half the words is left out.
  assert.deepEqual(
    result.tasks.map((t) => t.id),
    ["a", "x"],
  );
  assert.equal(result.total, 2);
  assert.equal(result.partialMatch, true);
});

test("list_tasks returns at most 50 compact results and the real total", () => {
  const many = Array.from({ length: 70 }, (_, i) =>
    task({ id: `t${i}`, description: "x".repeat(500) }),
  );
  const result = filterTasks(many, {});
  assert.equal(LIST_TASKS_LIMIT, 50);
  assert.equal(result.total, 70);
  assert.equal(result.tasks.length, 50);
  assert.equal(result.truncated, true);
  const [first] = result.tasks;
  assert.ok((first.description ?? "").length <= 201);
  assert.equal(first.dueDate, null);
  assert.equal(first.groupName, "Finanzas");
});

test("list_tasks reports how many matches each status has, even past the cap", () => {
  const many = [
    ...Array.from({ length: 60 }, (_, i) =>
      task({ id: `p${i}`, status: "pausada" }),
    ),
    task({ id: "e", status: "en_curso" }),
    task({ id: "d", status: "disponible" }),
  ];
  const result = filterTasks(many, { excludeCompleted: true });
  assert.equal(result.truncated, true);
  // The counts cover every match, so a status missing from the capped list
  // still shows up (or its absence is explicit: no zero entries).
  assert.deepEqual(result.byStatus, {
    pausada: 60,
    en_curso: 1,
    disponible: 1,
  });
  assert.deepEqual(filterTasks([], {}).byStatus, {});
});

test("compact tasks show dates as YYYY-MM-DD and priority as a number", () => {
  const [compact] = filterTasks(
    [
      task({
        priority: "3.50",
        dueDate: new Date("2026-10-02T00:00:00Z"),
        completedAt: new Date("2026-09-28T00:00:00Z"),
      }),
    ],
    {},
  ).tasks;
  assert.equal(compact.dueDate, "2026-10-02");
  assert.equal(compact.completedAt, "2026-09-28");
  assert.equal(compact.priority, 3.5);
});

test("declares the 13 tools of the design, 4 of them destructive", () => {
  const names = TOOL_DECLARATIONS.map((tool) => tool.name).sort();
  assert.deepEqual(names, [
    "add_comment",
    "archive_group",
    "create_group",
    "create_task",
    "delete_group",
    "delete_task",
    "get_task",
    "get_today_activity",
    "list_groups",
    "list_tasks",
    "unarchive_group",
    "update_group",
    "update_task",
  ]);
  for (const tool of TOOL_DECLARATIONS) {
    assert.equal(tool.type, "function");
    assert.ok(tool.description.length > 0, tool.name);
    assert.equal(tool.parameters.type, "object", tool.name);
  }
  assert.deepEqual([...DESTRUCTIVE_TOOLS].sort(), [
    "archive_group",
    "delete_group",
    "delete_task",
    "unarchive_group",
  ]);
});

test("only the four destructive tools need confirmation", () => {
  for (const tool of TOOL_DECLARATIONS) {
    assert.equal(
      isDestructive(tool.name),
      DESTRUCTIVE_TOOLS.has(tool.name),
      tool.name,
    );
  }
  assert.equal(isDestructive("create_task"), false);
  assert.equal(isDestructive("update_task"), false);
  assert.equal(isDestructive("drop_database"), false);
});

test("confirmations name the item and count a group's tasks", () => {
  assert.equal(
    confirmationSummary("delete_task", { name: "Enviar factura" }),
    "Eliminar la tarea «Enviar factura»",
  );
  assert.equal(
    confirmationSummary("delete_group", { name: "Finanzas", taskCount: 3 }),
    "Eliminar el grupo «Finanzas» y sus 3 tareas",
  );
  assert.equal(
    confirmationSummary("delete_group", { name: "Finanzas", taskCount: 1 }),
    "Eliminar el grupo «Finanzas» y su única tarea",
  );
  assert.equal(
    confirmationSummary("delete_group", { name: "Vacío", taskCount: 0 }),
    "Eliminar el grupo «Vacío» (no tiene tareas)",
  );
  assert.equal(
    confirmationSummary("archive_group", { name: "Finanzas" }),
    "Archivar el grupo «Finanzas»",
  );
  assert.equal(
    confirmationSummary("unarchive_group", { name: "Finanzas" }),
    "Desarchivar el grupo «Finanzas»",
  );
});
