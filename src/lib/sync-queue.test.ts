import assert from "node:assert/strict";
import { test } from "node:test";
import { createSyncQueue, isTempId, tempId } from "./sync-queue";

const failOnError = (error: unknown) => assert.fail(String(error));

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("tempId is recognised as temporary", () => {
  assert.equal(isTempId(tempId()), true);
  assert.equal(isTempId("3f2a"), false);
});

test("jobs for the same key run in order", async () => {
  const queue = createSyncQueue({ onError: failOnError });
  const log: string[] = [];
  const first = deferred<void>();
  queue.run("a", async () => {
    await first.promise;
    log.push("first");
  });
  queue.run("a", async () => {
    log.push("second");
  });
  await tick();
  assert.deepEqual(log, []);
  first.resolve();
  await tick();
  assert.deepEqual(log, ["first", "second"]);
});

test("jobs for different keys do not wait for each other", async () => {
  const queue = createSyncQueue({ onError: failOnError });
  const log: string[] = [];
  queue.run("a", () => new Promise(() => {}));
  queue.run("b", async () => {
    log.push("b");
  });
  await tick();
  assert.deepEqual(log, ["b"]);
});

test("idFor waits for the creation of a temporary key", async () => {
  const queue = createSyncQueue({ onError: failOnError });
  const key = tempId();
  const server = deferred<string>();
  queue.create(key, () => server.promise);
  const seen: string[] = [];
  queue.run(key, async () => {
    seen.push(await queue.idFor(key));
  });
  server.resolve("real-1");
  await tick();
  assert.deepEqual(seen, ["real-1"]);
  assert.equal(await queue.idFor("existing"), "existing");
});

test("a failed job is reported and later jobs still run", async () => {
  const errors: unknown[] = [];
  const queue = createSyncQueue({ onError: (e) => errors.push(e) });
  const log: string[] = [];
  queue.run("a", async () => {
    throw new Error("boom");
  });
  queue.run("a", async () => {
    log.push("after");
  });
  await tick();
  assert.equal(errors.length, 1);
  assert.deepEqual(log, ["after"]);
});

test("pending count returns to zero when the queue drains", async () => {
  const counts: number[] = [];
  const queue = createSyncQueue({
    onError: () => {},
    onPendingChange: (n) => counts.push(n),
  });
  queue.run("a", async () => {});
  queue.run("b", async () => {
    throw new Error("x");
  });
  await tick();
  assert.equal(counts.at(-1), 0);
  assert.equal(Math.max(...counts), 2);
});
