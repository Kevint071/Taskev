import { defineConfig } from "drizzle-kit";
import { requireEnv } from "./src/lib/env";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: requireEnv("DATABASE_URL"),
  },
});
