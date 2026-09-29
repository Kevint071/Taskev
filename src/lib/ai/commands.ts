/**
 * Slash commands of the assistant's input. The menu that suggests them lives
 * in the chat view; the server expands a command into the instructions the
 * model actually receives, while the user's transcript keeps what they typed.
 */

export type SlashCommand = {
  name: string;
  /** Other spellings that also match, e.g. the English name. */
  aliases: string[];
  title: string;
  hint: string;
  /** true: the command is useless without text, so picking it fills the input. */
  needsArgs: boolean;
  expand(args: string): string;
};

const MAX_TITLE = 150;

/** What optional text after a query command means to the model. */
function withDetail(base: string, args: string): string {
  return args ? `${base}\n\nDetalle del usuario: «${args}»` : base;
}

const CREATE_TASK = `El usuario quiere crear una tarea con el comando /crear. Este es su borrador, tal como lo escribió, con posibles faltas de ortografía o una redacción improvisada:
«{draft}»

Crea la tarea ya con create_task, sin pedir confirmación, y hazlo así:
1. Título: reescribe el borrador con ortografía y tildes correctas y una redacción clara y concisa, en ${MAX_TITLE} caracteres como máximo. Conserva el sentido y los nombres propios o términos técnicos; no añadas datos que el borrador no contenga.
2. Descripción: una o dos frases que aclaren qué hay que hacer y para qué o cuál es el resultado esperado. Debe aportar contexto útil, no repetir el título con otras palabras. Si el borrador no permite deducir nada más sin inventarlo, redacta solo el alcance más razonable en una frase.
3. Prioridad (priority): elige según la urgencia e importancia que sugiera el borrador. 0 sin prioridad, 1 baja, 2 media, 3 alta, 4 o 5 crítica o bloqueante para otras cosas. Ante la duda, usa 2.
4. Fecha límite (dueDate): solo si el borrador menciona una fecha o un plazo; si no, no la envíes.
5. Grupo: si el borrador nombra un grupo, o hay solo uno que encaje claramente, úsalo (consulta list_groups). Si hay varios posibles, pregunta cuál antes de crear nada y ofrece los nombres.

Al terminar, responde en pocas líneas con el título final, la prioridad elegida y por qué, y ofrece ajustarla si el usuario lo prefiere.`;

const COMMENT_TASK = `El usuario quiere anotar algo en una tarea con el comando /comentar. Esto es lo que escribió, con posibles faltas de ortografía:
«{draft}»

Identifica la tarea a la que se refiere (búscala con list_tasks) y añade la nota con add_comment, sin pedir confirmación. Corrige ortografía y redacción sin cambiar el sentido ni añadir datos. Si no queda claro a qué tarea se refiere o coincide con varias, pregunta cuál antes de anotar.`;

export const COMMANDS: SlashCommand[] = [
  {
    name: "crear",
    aliases: ["create"],
    title: "Crear tarea",
    hint: "Corrijo el texto, escribo la descripción y elijo la prioridad",
    needsArgs: true,
    expand: (args) => CREATE_TASK.replace("{draft}", () => args),
  },
  {
    name: "comentar",
    aliases: ["comment"],
    title: "Comentar tarea",
    hint: "Anota en la bitácora con el texto ya pulido",
    needsArgs: true,
    expand: (args) => COMMENT_TASK.replace("{draft}", () => args),
  },
  {
    name: "bloqueadas",
    aliases: ["blocked"],
    title: "Tareas bloqueadas",
    hint: "Qué está detenido y en qué grupo",
    needsArgs: false,
    expand: (args) =>
      withDetail(
        "Muéstrame mis tareas bloqueadas, agrupadas por grupo, y sugiere cómo desbloquear las más importantes.",
        args,
      ),
  },
  {
    name: "vencen",
    aliases: ["due"],
    title: "Qué vence pronto",
    hint: "Vencidas y con fecha límite esta semana",
    needsArgs: false,
    expand: (args) =>
      withDetail(
        "¿Qué tareas están vencidas o vencen esta semana? Ordénalas por fecha.",
        args,
      ),
  },
  {
    name: "hoy",
    aliases: ["today"],
    title: "Resumen de hoy",
    hint: "Lo que has avanzado y completado",
    needsArgs: false,
    expand: (args) =>
      withDetail(
        "Resume lo que he hecho hoy: tareas creadas, cambios de estado y comentarios.",
        args,
      ),
  },
  {
    name: "priorizar",
    aliases: ["prioritize"],
    title: "Qué priorizar",
    hint: "Te propongo por dónde empezar",
    needsArgs: false,
    expand: (args) =>
      withDetail(
        "¿Por dónde debería empezar hoy? Ten en cuenta fechas, prioridades y bloqueos.",
        args,
      ),
  },
];

/** Lowercase without accents, so "/CRÉAR" and "/crear" are the same word. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function spellings(command: SlashCommand): string[] {
  return [command.name, ...command.aliases];
}

/**
 * Commands to suggest for what the user has typed: only while the input is a
 * slash followed by the start of a command name, before any space.
 */
export function matchCommands(draft: string): SlashCommand[] {
  const typed = /^\/(\p{L}*)$/u.exec(draft)?.[1];
  if (typed === undefined) return [];
  const prefix = fold(typed);
  return COMMANDS.filter((command) =>
    spellings(command).some((spelling) => spelling.startsWith(prefix)),
  );
}

/** The command a message starts with, and the text after it. */
export function parseCommand(
  text: string,
): { command: SlashCommand; args: string } | null {
  const match = /^\/(\p{L}+)(?:\s+([\s\S]*))?$/u.exec(text.trim());
  if (!match) return null;
  const word = fold(match[1]);
  const command = COMMANDS.find((c) => spellings(c).includes(word));
  if (!command) return null;
  return { command, args: (match[2] ?? "").trim() };
}

/**
 * The instructions for the model, or null when the message is not a command
 * (or lacks the text the command needs) and travels as written.
 */
export function expandCommand(text: string): string | null {
  const parsed = parseCommand(text);
  if (!parsed) return null;
  const { command, args } = parsed;
  if (command.needsArgs && !args) return null;
  return command.expand(args);
}
