import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { PlaceCacheEndpoint } from "@casinodb/shared";
import { db, sql } from "../db/index.js";
import { placeCache } from "../db/schema.js";

export function cacheKeyHash(parts: unknown): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function nearbyCacheKey(lat: number, lng: number, radius: number): string {
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  return cacheKeyHash({ lat: roundedLat, lng: roundedLng, radius });
}

export function autocompleteCacheKey(query: string): string {
  return cacheKeyHash({ q: query.trim().toLowerCase() });
}

export async function readCache<T>(
  endpoint: PlaceCacheEndpoint,
  cacheKey: string,
): Promise<T | null> {
  const now = new Date();
  const rows = await db
    .select()
    .from(placeCache)
    .where(
      and(
        eq(placeCache.endpoint, endpoint),
        eq(placeCache.cacheKey, cacheKey),
        gt(placeCache.expiresAt, now),
      ),
    )
    .limit(1);
  const row = rows[0];
  return row ? (row.payload as T) : null;
}

export async function writeCache(
  endpoint: PlaceCacheEndpoint,
  cacheKey: string,
  payload: unknown,
  ttlSeconds: number,
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  await sql`
    INSERT INTO place_cache (endpoint, cache_key, payload, fetched_at, expires_at)
    VALUES (
      ${endpoint},
      ${cacheKey},
      ${sql.json(JSON.parse(JSON.stringify(payload)) as Parameters<typeof sql.json>[0])},
      ${now.toISOString()}::timestamptz,
      ${expiresAt.toISOString()}::timestamptz
    )
    ON CONFLICT (endpoint, cache_key)
    DO UPDATE SET
      payload = EXCLUDED.payload,
      fetched_at = EXCLUDED.fetched_at,
      expires_at = EXCLUDED.expires_at
  `;
}
