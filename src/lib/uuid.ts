const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether `value` is a canonical UUID. Checked before querying `uuid` columns,
 * where anything else makes Postgres throw instead of simply matching nothing.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
