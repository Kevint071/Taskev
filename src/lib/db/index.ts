import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { requireEnv } from "../env";
import * as schema from "./schema";

// The underlying HTTP fetch to Neon occasionally fails transiently (e.g.
// behind flaky corporate proxies). One retry avoids surfacing that as a
// user-facing 500 for what is otherwise a normal request.
neonConfig.fetchFunction = async (
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1],
) => {
  try {
    return await fetch(input, init);
  } catch {
    return fetch(input, init);
  }
};

const sql = neon(requireEnv("DATABASE_URL"));

export const db = drizzle(sql, { schema });
