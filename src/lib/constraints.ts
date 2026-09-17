export const MIN_PASSWORD_LENGTH = 8;
export const TASK_STATUSES = [
  "disponible",
  "en_curso",
  "bloqueada",
  "pausada",
  "completada",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const MAX_NAME_LENGTH = 80;
export const MAX_TASK_TITLE_LENGTH = 150;
export const MAX_PROJECT_NAME_LENGTH = 150;
