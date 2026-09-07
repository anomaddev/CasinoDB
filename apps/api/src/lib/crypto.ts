import { createHmac, randomBytes } from "node:crypto";
import { env } from "../env.js";
import type { ApiScope } from "@casinodb/shared";

const KEY_PREFIX = "cdb_";

export function generateApiKey(): string {
  return `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashSecret(value: string): string {
  return createHmac("sha256", env.API_KEY_PEPPER).update(value).digest("hex");
}

export function reporterHash(
  sourceApp: string,
  externalAuthorId: string | undefined,
): string | null {
  if (!externalAuthorId) return null;
  return hashSecret(`${sourceApp}:${externalAuthorId}`);
}

export function hasScope(scopes: string[], needed: ApiScope): boolean {
  return scopes.includes(needed);
}
