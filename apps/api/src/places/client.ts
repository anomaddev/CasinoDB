export type NormalizedPlace = {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  userRatingCount: number | null;
  types: string[];
  phone: string | null;
  website: string | null;
  googleMapsUri: string | null;
  businessStatus: string | null;
  openNow: boolean | null;
  regularHours: unknown | null;
};

export type AutocompleteHit = {
  placeId: string;
  displayName: string;
  formattedAddress: string | null;
};

type GooglePlace = {
  id?: string;
  name?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  currentOpeningHours?: { openNow?: boolean };
  regularOpeningHours?: unknown;
};

type NearbyResponse = { places?: GooglePlace[] };
type DetailsResponse = GooglePlace;
type AutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      text?: { text?: string };
    };
  }>;
};

const PLACES_BASE = "https://places.googleapis.com/v1";

const PLACE_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "types",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "businessStatus",
  "currentOpeningHours.openNow",
  "regularOpeningHours",
].join(",");

const NEARBY_FIELD_MASK = PLACE_FIELD_MASK.split(",")
  .map((field) => `places.${field}`)
  .join(",");

export class PlacesClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "PlacesClientError";
  }
}

export function normalizePlaceId(id: string): string {
  return id.startsWith("places/") ? id.slice("places/".length) : id;
}

function requireApiKey(apiKey: string): string {
  if (!apiKey) {
    throw new PlacesClientError("GOOGLE_PLACES_API_KEY is not configured");
  }
  return apiKey;
}

async function googleJson<T>(
  apiKey: string,
  url: string,
  init: RequestInit,
  fieldMask: string,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
      ...(init.headers ?? {}),
    },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new PlacesClientError(
      `Google Places request failed (${response.status})`,
      response.status,
      body,
    );
  }
  return body as T;
}

export function normalizePlace(place: GooglePlace): NormalizedPlace | null {
  const rawId = place.id ?? place.name;
  const location = place.location;
  if (!rawId || location?.latitude == null || location.longitude == null) {
    return null;
  }
  return {
    placeId: normalizePlaceId(rawId),
    name: place.displayName?.text?.trim() || "Unknown Casino",
    formattedAddress: place.formattedAddress ?? "",
    latitude: location.latitude,
    longitude: location.longitude,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    types: place.types ?? [],
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    googleMapsUri: place.googleMapsUri ?? null,
    businessStatus: place.businessStatus ?? null,
    openNow: place.currentOpeningHours?.openNow ?? null,
    regularHours: place.regularOpeningHours ?? null,
  };
}

export function createPlacesClient(apiKey: string) {
  return {
    configured: Boolean(apiKey),

    async searchNearby(lat: number, lng: number, radius: number): Promise<NormalizedPlace[]> {
      const key = requireApiKey(apiKey);
      const body = await googleJson<NearbyResponse>(
        key,
        `${PLACES_BASE}/places:searchNearby`,
        {
          method: "POST",
          body: JSON.stringify({
            includedTypes: ["casino"],
            maxResultCount: 20,
            locationRestriction: {
              circle: {
                center: { latitude: lat, longitude: lng },
                radius,
              },
            },
          }),
        },
        NEARBY_FIELD_MASK,
      );
      return (body.places ?? [])
        .map(normalizePlace)
        .filter((place): place is NormalizedPlace => place !== null);
    },

    async autocomplete(query: string): Promise<AutocompleteHit[]> {
      const key = requireApiKey(apiKey);
      const body = await googleJson<AutocompleteResponse>(
        key,
        `${PLACES_BASE}/places:autocomplete`,
        {
          method: "POST",
          body: JSON.stringify({
            input: query,
            includedPrimaryTypes: ["casino"],
          }),
        },
        "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.text",
      );
      return (body.suggestions ?? [])
        .map((suggestion) => {
          const prediction = suggestion.placePrediction;
          if (!prediction?.placeId) return null;
          return {
            placeId: normalizePlaceId(prediction.placeId),
            displayName:
              prediction.structuredFormat?.mainText?.text ??
              prediction.text?.text ??
              "Unknown Casino",
            formattedAddress: prediction.structuredFormat?.secondaryText?.text ?? null,
          };
        })
        .filter((hit): hit is AutocompleteHit => hit !== null);
    },

    async placeDetails(placeId: string): Promise<NormalizedPlace | null> {
      const key = requireApiKey(apiKey);
      const id = normalizePlaceId(placeId);
      const body = await googleJson<DetailsResponse>(
        key,
        `${PLACES_BASE}/places/${encodeURIComponent(id)}`,
        { method: "GET" },
        PLACE_FIELD_MASK,
      );
      return normalizePlace(body);
    },
  };
}

export type PlacesClient = ReturnType<typeof createPlacesClient>;
