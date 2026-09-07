import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";
import { env, repoRoot } from "../env.js";

const migrationsDir = join(repoRoot, "drizzle");

async function migrate() {
  const sql = postgres(env.DATABASE_URL, { max: 1 });
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    const files = (await readdir(migrationsDir))
      .filter((name) => name.endsWith(".sql"))
      .sort();

    for (const filename of files) {
      const applied = await sql`
        SELECT 1 FROM schema_migrations WHERE filename = ${filename}
      `;
      if (applied.length > 0) {
        console.log(`skip  ${filename}`);
        continue;
      }

      const contents = await readFile(join(migrationsDir, filename), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(contents);
        await tx`INSERT INTO schema_migrations (filename) VALUES (${filename})`;
      });
      console.log(`apply ${filename}`);
    }

    console.log("Migrations complete.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
