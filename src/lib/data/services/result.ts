/**
 * Writes shared by the route handlers and the assistant's tools. Each one
 * assumes the caller already checked ownership (requireOwned* / ownedGroup /
 * ownedTask) and fails with the same status and Spanish message the HTTP
 * API has always returned.
 */
export type MutationResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

export type Body = Record<string, unknown> | null | undefined;

export function fail(status: number, error: string) {
  return { ok: false, status, error } as const;
}
