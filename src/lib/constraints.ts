export const MIN_PASSWORD_LENGTH = 8;
export const TASK_STATUSES = [
  "disponible",
  "en_curso",
  "bloqueada",
  "pausada",
  "completada",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
export const MAX_NAME_LENGTH = 80;
// Password recovery by email is switched off for now; flip to re-enable.
export const PASSWORD_RESET_ENABLED = false;
