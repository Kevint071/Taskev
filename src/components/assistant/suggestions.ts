import type { ComponentType } from "react";
import {
  CalendarIcon,
  CheckIcon,
  FlagIcon,
  NoteIcon,
  PlusIcon,
  SparklesIcon,
} from "@/components/ui/icons";

type IconComponent = ComponentType<{ className?: string }>;

export type Suggestion = {
  icon: IconComponent;
  title: string;
  hint: string;
  prompt: string;
  /** Questions are sent as they are; requests that need details fill the input. */
  send: boolean;
};

export const SUGGESTIONS: Suggestion[] = [
  {
    icon: FlagIcon,
    title: "Qué está bloqueado",
    hint: "Tareas detenidas y en qué grupo están",
    prompt: "¿Qué tareas tengo bloqueadas?",
    send: true,
  },
  {
    icon: CalendarIcon,
    title: "Qué vence pronto",
    hint: "Fechas límite de esta semana",
    prompt: "¿Qué vence esta semana?",
    send: true,
  },
  {
    icon: CheckIcon,
    title: "Resumen de hoy",
    hint: "Lo que has avanzado y completado",
    prompt: "¿Qué he hecho hoy?",
    send: true,
  },
  {
    icon: PlusIcon,
    title: "Crear una tarea",
    hint: "Dime el título, el grupo y la fecha",
    prompt: "Crea una tarea llamada ",
    send: false,
  },
  {
    icon: NoteIcon,
    title: "Comentar una tarea",
    hint: "Deja una nota sin abrir la tarea",
    prompt: "Añade un comentario a la tarea ",
    send: false,
  },
  {
    icon: SparklesIcon,
    title: "Qué priorizar",
    hint: "Te propongo por dónde empezar",
    prompt: "¿Por dónde debería empezar hoy? Ten en cuenta fechas y bloqueos.",
    send: true,
  },
];

export const COMMAND_ICONS: Record<string, IconComponent> = {
  crear: PlusIcon,
  comentar: NoteIcon,
  bloqueadas: FlagIcon,
  vencen: CalendarIcon,
  hoy: CheckIcon,
  priorizar: SparklesIcon,
};
