import { neon } from "@neondatabase/serverless";
import { requireEnv } from "../env";

async function main() {
  const sql = neon(requireEnv("DATABASE_URL"));
  const result = await sql`SELECT 1 as ok`;
  console.log("Connection OK:", result);
}

main().catch((err) => {
  console.error("Connection FAILED:", err);
  process.exit(1);
});
