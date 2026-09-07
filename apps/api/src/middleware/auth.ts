import type { Context, Next } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import type { ApiScope } from "@casinodb/shared";
import { db } from "../db/index.js";
import { apiClients } from "../db/schema.js";
import { hashSecret, hasScope } from "../lib/crypto.js";
import { forbidden, unauthorized } from "../lib/errors.js";

export type RequestClient = {
  id: string;
  name: string;
  sourceApp: string;
  scopes: string[];
};

export type AppEnv = {
  Variables: {
    client: RequestClient;
  };
};

function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export function requireAuth(scope: ApiScope) {
  return async (c: Context<AppEnv>, next: Next) => {
    const token = bearerToken(c.req.header("Authorization"));
    if (!token) throw unauthorized();

    const keyHash = hashSecret(token);
    const rows = await db
      .select()
      .from(apiClients)
      .where(and(eq(apiClients.keyHash, keyHash), isNull(apiClients.revokedAt)))
      .limit(1);

    const client = rows[0];
    if (!client) throw unauthorized();
    if (!hasScope(client.scopes, scope)) throw forbidden();

    c.set("client", {
      id: client.id,
      name: client.name,
      sourceApp: client.sourceApp,
      scopes: client.scopes,
    });
    await next();
  };
}
