/**
 * Background sync for optimistic UI: the screen changes immediately and the
 * matching API calls run here afterwards.
 *
 * Jobs for the same key (a task) run strictly in order, so a quick
 * "create → change status → delete" reaches the server in that order. Items
 * created optimistically get a temporary id; jobs queued behind the creation
 * resolve the real id with `idFor` before calling the API.
 */

const TEMP_PREFIX = "tmp-";

export function tempId(): string {
  return `${TEMP_PREFIX}${crypto.randomUUID()}`;
}

export function isTempId(id: string): boolean {
  return id.startsWith(TEMP_PREFIX);
}

export type SyncQueue = {
  /** Queues `job` behind every earlier job for `key`. */
  run: (key: string, job: () => Promise<void>) => void;
  /** Queues the creation of `key`; `job` returns the id the server assigned. */
  create: (key: string, job: () => Promise<string>) => void;
  /** The server id for `key`, waiting for its creation when it is temporary. */
  idFor: (key: string) => Promise<string>;
};

export function createSyncQueue(options: {
  onError: (error: unknown) => void;
  onPendingChange?: (pending: number) => void;
}): SyncQueue {
  const tails = new Map<string, Promise<void>>();
  const createdIds = new Map<string, Promise<string>>();
  let pending = 0;

  function changePending(delta: number) {
    pending += delta;
    options.onPendingChange?.(pending);
  }

  function run(key: string, job: () => Promise<void>) {
    changePending(1);
    const previous = tails.get(key) ?? Promise.resolve();
    const tail: Promise<void> = previous
      .then(job)
      .catch((error) => options.onError(error))
      .finally(() => {
        changePending(-1);
        if (tails.get(key) === tail) tails.delete(key);
      });
    tails.set(key, tail);
  }

  function create(key: string, job: () => Promise<string>) {
    let settle!: (id: Promise<string>) => void;
    const id = new Promise<string>((resolve) => {
      settle = resolve;
    });
    // Failures are reported once through run(); dependants just skip.
    id.catch(() => {});
    createdIds.set(key, id);
    run(key, async () => {
      const result = job();
      settle(result);
      await result;
    });
  }

  function idFor(key: string): Promise<string> {
    return createdIds.get(key) ?? Promise.resolve(key);
  }

  return { run, create, idFor };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** fetch + JSON that throws `ApiError` on any non-2xx response. */
export async function sendJson<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      typeof data?.error === "string"
        ? data.error
        : "No se pudo guardar el cambio",
      res.status,
    );
  }
  return data as T;
}
