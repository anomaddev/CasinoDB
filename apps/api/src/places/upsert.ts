import { eq } from "drizzle-orm";
import type { CasinoHint } from "@casinodb/shared";
import { db } from "../db/index.js";
import { casinoStatus, casinos, type CasinoRow } from "../db/schema.js";
import type { NormalizedPlace } from "./client.js";

export async function getCasinoByPlaceId(placeId: string): Promise<CasinoRow | null> {
  const rows = await db.select().from(casinos).where(eq(casinos.placeId, placeId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertNormalizedPlace(place: NormalizedPlace): Promise<CasinoRow> {
  const now = new Date();
  const [row] = await db
    .insert(casinos)
    .values({
      placeId: place.placeId,
      name: place.name,
      formattedAddress: place.formattedAddress,
      latitude: place.latitude,
      longitude: place.longitude,
      googleRating: place.rating,
      googleUserRatingsTotal: place.userRatingCount,
      types: place.types,
      phone: place.phone,
      website: place.website,
      googleMapsUri: place.googleMapsUri,
      fetchedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: casinos.placeId,
      set: {
        name: place.name,
        formattedAddress: place.formattedAddress,
        latitude: place.latitude,
        longitude: place.longitude,
        googleRating: place.rating,
        googleUserRatingsTotal: place.userRatingCount,
        types: place.types,
        phone: place.phone,
        website: place.website,
        googleMapsUri: place.googleMapsUri,
        fetchedAt: now,
        updatedAt: now,
      },
    })
    .returning();

  if (!row) {
    throw new Error("Failed to upsert casino");
  }

  await db
    .insert(casinoStatus)
    .values({
      casinoId: row.id,
      businessStatus: place.businessStatus,
      openNow: place.openNow,
      regularHours: place.regularHours,
      source: "google_places",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: casinoStatus.casinoId,
      set: {
        businessStatus: place.businessStatus,
        openNow: place.openNow,
        regularHours: place.regularHours,
        source: "google_places",
        updatedAt: now,
      },
    });

  return row;
}

export async function upsertFromHint(placeId: string, hint: CasinoHint): Promise<CasinoRow | null> {
  if (!hint.coordinates) return null;
  const now = new Date();
  const existing = await getCasinoByPlaceId(placeId);
  if (existing) {
    const [row] = await db
      .update(casinos)
      .set({
        name: hint.name ?? existing.name,
        formattedAddress: hint.address ?? existing.formattedAddress,
        latitude: hint.coordinates.latitude,
        longitude: hint.coordinates.longitude,
        updatedAt: now,
      })
      .where(eq(casinos.id, existing.id))
      .returning();
    return row ?? existing;
  }

  const [row] = await db
    .insert(casinos)
    .values({
      placeId,
      name: hint.name ?? "Unknown Casino",
      formattedAddress: hint.address ?? "",
      latitude: hint.coordinates.latitude,
      longitude: hint.coordinates.longitude,
      types: ["casino"],
      updatedAt: now,
    })
    .returning();
  return row ?? null;
}
