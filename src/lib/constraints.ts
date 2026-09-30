export const MIN_PASSWORD_LENGTH = 10;
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
export const MAX_GROUP_NAME_LENGTH = 150;

/** UI-only limit for a group's description; the API does not enforce it. */
export const MAX_GROUP_DESCRIPTION_LENGTH = 280;
