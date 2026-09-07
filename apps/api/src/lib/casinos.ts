import {
  DEFAULT_NEARBY_RADIUS_METERS,
  EMPTY_INTEL,
  type AutocompleteSuggestion,
  type Casino,
  type CasinoHint,
} from "@casinodb/shared";
import { env } from "../env.js";
import { sql } from "../db/index.js";
import type { CasinoRow } from "../db/schema.js";
import { notFound, placesUnavailable } from "./errors.js";
import { intelForCasinos, toPublicCasino, toPublicCasinos } from "./intel.js";
import { recordObservations } from "./observations.js";
import {
  autocompleteCacheKey,
  nearbyCacheKey,
  readCache,
  writeCache,
} from "./place-cache.js";
import {
  PlacesClientError,
  createPlacesClient,
  normalizePlaceId,
  type AutocompleteHit,
  type NormalizedPlace,
} from "../places/client.js";
import { getCasinoByPlaceId, upsertFromHint, upsertNormalizedPlace } from "../places/upsert.js";

const places = createPlacesClient(env.GOOGLE_PLACES_API_KEY);

type NearbySource = "cache" | "google" | "database";

function isDetailsStale(row: CasinoRow): boolean {
  if (!row.fetchedAt) return true;
  return Date.now() - row.fetchedAt.getTime() > env.PLACES_DETAILS_TTL_SECONDS * 1000;
}

async function queryNearbyRows(lat: number, lng: number, radius: number): Promise<CasinoRow[]> {
  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT
      id,
      place_id,
      name,
      formatted_address,
      latitude,
      longitude,
      google_rating,
      google_user_ratings_total,
      types,
      phone,
      website,
      google_maps_uri,
      fetched_at,
      created_at,
      updated_at
    FROM casinos
    WHERE ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      ${radius}
    )
    ORDER BY ST_Distance(
      location,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    )
  `;
  return rows.map(mapCasinoRow);
}

function mapCasinoRow(row: Record<string, unknown>): CasinoRow {
  return {
    id: String(row.id),
    placeId: String(row.place_id),
    name: String(row.name),
    formattedAddress: String(row.formatted_address),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    googleRating: row.google_rating == null ? null : Number(row.google_rating),
    googleUserRatingsTotal:
      row.google_user_ratings_total == null ? null : Number(row.google_user_ratings_total),
    types: Array.isArray(row.types) ? (row.types as string[]) : [],
    phone: row.phone == null ? null : String(row.phone),
    website: row.website == null ? null : String(row.website),
    googleMapsUri: row.google_maps_uri == null ? null : String(row.google_maps_uri),
    fetchedAt: row.fetched_at ? new Date(String(row.fetched_at)) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

async function refreshFromGoogle(placeId: string): Promise<CasinoRow | null> {
  if (!places.configured) return getCasinoByPlaceId(placeId);
  try {
    const cached = await readCache<NormalizedPlace>("details", placeId);
    if (cached) return upsertNormalizedPlace(cached);

    const place = await places.placeDetails(placeId);
    if (!place) return getCasinoByPlaceId(placeId);
    await writeCache("details", placeId, place, env.PLACES_DETAILS_TTL_SECONDS);
    return upsertNormalizedPlace(place);
  } catch (error) {
    if (error instanceof PlacesClientError) {
      return getCasinoByPlaceId(placeId);
    }
    throw error;
  }
}

export async function searchNearby(
  lat: number,
  lng: number,
  radius = DEFAULT_NEARBY_RADIUS_METERS,
  sourceApp?: string,
): Promise<{ casinos: Casino[]; source: NearbySource }> {
  const key = nearbyCacheKey(lat, lng, radius);
  const cached = await readCache<{ placeIds: string[] }>("nearby", key);
  let source: NearbySource = "database";

  if (cached) {
    source = "cache";
  } else if (places.configured) {
    try {
      const placesFound = await places.searchNearby(lat, lng, radius);
      for (const place of placesFound) {
        await upsertNormalizedPlace(place);
        await writeCache("details", place.placeId, place, env.PLACES_DETAILS_TTL_SECONDS);
      }
      await writeCache(
        "nearby",
        key,
        { placeIds: placesFound.map((place) => place.placeId) },
        env.PLACES_NEARBY_TTL_SECONDS,
      );
      source = "google";
    } catch (error) {
      if (!(error instanceof PlacesClientError)) throw error;
      source = "database";
    }
  }

  const rows = await queryNearbyRows(lat, lng, radius);
  const casinos = await toPublicCasinos(rows);
  if (sourceApp) {
    await recordObservations(
      rows.map((row) => row.id),
      "search",
      sourceApp,
      { latitude: lat, longitude: lng },
    );
  }
  return { casinos, source };
}

export async function autocomplete(
  query: string,
): Promise<{ suggestions: AutocompleteSuggestion[]; source: "cache" | "google" }> {
  const key = autocompleteCacheKey(query);
  const cached = await readCache<AutocompleteHit[]>("autocomplete", key);
  if (cached) {
    return { suggestions: cached, source: "cache" };
  }
  if (!places.configured) {
    return { suggestions: [], source: "google" };
  }
  try {
    const suggestions = await places.autocomplete(query);
    await writeCache("autocomplete", key, suggestions, env.PLACES_AUTOCOMPLETE_TTL_SECONDS);
    return { suggestions, source: "google" };
  } catch (error) {
    if (error instanceof PlacesClientError) {
      throw placesUnavailable();
    }
    throw error;
  }
}

export async function getCasino(
  placeId: string,
  sourceApp?: string,
): Promise<Casino> {
  const id = normalizePlaceId(placeId);
  let row = await getCasinoByPlaceId(id);
  if (!row || isDetailsStale(row)) {
    const refreshed = await refreshFromGoogle(id);
    if (refreshed) row = refreshed;
  }
  if (!row) {
    if (places.configured) {
      // Google was tried (or skipped because of error) and nothing is stored.
      const existing = await getCasinoByPlaceId(id);
      if (!existing) throw notFound();
      row = existing;
    } else {
      throw notFound();
    }
  }
  const intel = (await intelForCasinos([row.id])).get(row.id) ?? { ...EMPTY_INTEL };
  if (sourceApp) {
    await recordObservations([row.id], "search", sourceApp);
  }
  return toPublicCasino(row, intel);
}

export async function ensureCasino(
  placeId: string,
  hint?: CasinoHint,
): Promise<CasinoRow> {
  const id = normalizePlaceId(placeId);
  let row = await getCasinoByPlaceId(id);
  if (!row || isDetailsStale(row)) {
    const refreshed = await refreshFromGoogle(id);
    if (refreshed) row = refreshed;
  }
  if (!row && hint) {
    row = (await upsertFromHint(id, hint)) ?? null;
  }
  if (!row) {
    throw notFound();
  }
  return row;
}

export async function startSession(
  placeId: string,
  sourceApp: string,
  hint?: CasinoHint,
): Promise<Casino> {
  const row = await ensureCasino(placeId, hint);
  await recordObservations([row.id], "session", sourceApp, hint?.coordinates);
  const intel = (await intelForCasinos([row.id])).get(row.id) ?? { ...EMPTY_INTEL };
  return toPublicCasino(row, intel);
}
