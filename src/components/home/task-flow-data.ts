export type Chip = {
  id: string;
  title: string;
  group: string;
  due: string;
  progress: number;
  status: "en_curso" | "disponible";
  /** Where it floats before Taskev sorts it: x in % of its own width, y in px. */
  x: number;
  y: number;
  rot: number;
  scale: number;
};

/** In the order Taskev would rank them: the day's work comes off the top. */
export const CHIPS: Chip[] = [
  {
    id: "propuesta",
    title: "Enviar propuesta al cliente",
    group: "Trabajo",
    due: "hoy",
    progress: 60,
    status: "en_curso",
    x: -18,
    y: 225,
    rot: -5,
    scale: 1,
  },
  {
    id: "contrato",
    title: "Revisar contrato de alquiler",
    group: "Casa",
    due: "mañana",
    progress: 20,
    status: "en_curso",
    x: 30,
    y: 55,
    rot: 5,
    scale: 1.04,
  },
  {
    id: "charla",
    title: "Preparar charla de octubre",
    group: "Comunidad",
    due: "3 días",
    progress: 35,
    status: "en_curso",
    x: 26,
    y: 292,
    rot: -7,
    scale: 0.96,
  },
  {
    id: "dentista",
    title: "Pedir cita con el dentista",
    group: "Personal",
    due: "5 días",
    progress: 0,
    status: "disponible",
    x: -34,
    y: 115,
    rot: 7,
    scale: 1,
  },
  {
    id: "dominio",
    title: "Renovar dominio",
    group: "Web personal",
    due: "6 días",
    progress: 0,
    status: "disponible",
    x: 34,
    y: 172,
    rot: -4,
    scale: 0.94,
  },
  {
    id: "objetivos",
    title: "Definir objetivos del mes",
    group: "Planificación",
    due: "8 días",
    progress: 0,
    status: "disponible",
    x: -30,
    y: 0,
    rot: -6,
    scale: 0.98,
  },
];

/** Small labels drifting around the tasks; they melt away once things are in order. */
export const TAGS = [
  { label: "Vence hoy", x: -125, y: 66, rot: -8, dur: 4.6 },
  { label: "Prioridad alta", x: 120, y: 236, rot: 6, dur: 5.4 },
  { label: "En curso", x: -115, y: 305, rot: -4, dur: 4.1 },
];

export type Phase = "chaos" | "order" | "work" | "done" | "leave";

export const CAPTIONS: Record<Phase, string> = {
  chaos: "Todo llega a la vez.",
  order: "Lo que importa, arriba.",
  work: "Vas avanzando.",
  done: "Hecha.",
  leave: "Y ya sabes cuál sigue.",
};

export type Frame = {
  /** How many tasks have been completed so far: rotates which one is first. */
  k: number;
  phase: Phase;
  /** Progress of the first task while it is animating; `null` means its own. */
  pct: number | null;
};

export const START: Frame = { k: 0, phase: "order", pct: null };

export const COUNT = CHIPS.length;
const PITCH = 60;
export const CHIP_HEIGHT = 52;
export const STAGE_HEIGHT = (COUNT - 1) * PITCH + CHIP_HEIGHT + 12;

export type ChipKind = "chaos" | "lead" | "next" | "rest" | "done";

const slotOf = (index: number, k: number) =>
  (((index - k) % COUNT) + COUNT) % COUNT;

/** Where a task sits in the current frame, and how it should look there. */
export function describe(index: number, { k, phase }: Frame) {
  const base = slotOf(index, k);
  const gone = phase === "leave" && base === 0;
  // The first task has left, so everyone else moves up one place.
  const slot = phase === "leave" ? base - 1 : base;

  if (phase === "chaos") {
    const { x, y, rot, scale } = CHIPS[index];
    return {
      slot,
      kind: "chaos" as const,
      transform: `translate(calc(-50% + ${x}% * var(--spread)), ${y}px) rotate(${rot}deg) scale(${scale})`,
      opacity: 1,
      delay: index * 45,
      z: 10 + index,
    };
  }

  if (gone) {
    return {
      slot,
      kind: "done" as const,
      transform: "translate(calc(-50% + 80%), 0px) rotate(6deg) scale(0.94)",
      opacity: 0,
      delay: 0,
      z: 30,
    };
  }

  const kind: ChipKind =
    base === 0 && phase === "done"
      ? "done"
      : slot === 0
        ? "lead"
        : slot < 3
          ? "next"
          : "rest";

  return {
    slot,
    kind,
    transform: `translate(-50%, ${slot * PITCH}px)`,
    opacity: slot < 3 ? 1 : 0.7,
    delay: phase === "order" ? slot * 70 : 0,
    z: 20 - slot,
  };
}
