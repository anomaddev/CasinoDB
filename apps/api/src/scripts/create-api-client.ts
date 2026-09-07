import { ALL_API_SCOPES, apiScopeSchema, type ApiScope } from "@casinodb/shared";
import { eq } from "drizzle-orm";
import { db, sql } from "../db/index.js";
import { apiClients } from "../db/schema.js";
import { generateApiKey, hashSecret } from "../lib/crypto.js";

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return "";
  return value;
}

function usage(): never {
  console.error(`Usage:
  npm run keys:create -- --name "Local Dev" --source-app dev
  npm run keys:create -- --name "Local Dev" --source-app dev --scopes read,write:observations
  npm run keys:create -- --source-app dev --rotate
`);
  process.exit(1);
}

async function main() {
  const name = flag("name");
  const sourceApp = flag("source-app");
  const rotate = process.argv.includes("--rotate");
  const scopesArg = flag("scopes");

  if (!sourceApp) usage();

  const scopes: ApiScope[] = scopesArg
    ? scopesArg.split(",").map((scope) => apiScopeSchema.parse(scope.trim()))
    : [...ALL_API_SCOPES];

  const existing = (
    await db.select().from(apiClients).where(eq(apiClients.sourceApp, sourceApp)).limit(1)
  )[0];

  if (existing && !rotate) {
    console.error(
      `Client "${sourceApp}" already exists (id ${existing.id}). Pass --rotate to issue a new key.`,
    );
    process.exit(1);
  }

  const apiKey = generateApiKey();
  const keyHash = hashSecret(apiKey);

  if (existing && rotate) {
    await db
      .update(apiClients)
      .set({
        keyHash,
        scopes,
        revokedAt: null,
        ...(name ? { name } : {}),
      })
      .where(eq(apiClients.id, existing.id));
    console.log(`Rotated key for source_app=${sourceApp}`);
  } else {
    if (!name) usage();
    await db.insert(apiClients).values({
      name,
      sourceApp,
      keyHash,
      scopes,
    });
    console.log(`Created client source_app=${sourceApp} name=${name}`);
  }

  console.log("Store this API key now; it will not be shown again:");
  console.log(apiKey);
  await sql.end({ timeout: 5 });
}

main().catch(async (error) => {
  console.error(error);
  await sql.end({ timeout: 5 }).catch(() => undefined);
  process.exit(1);
});
