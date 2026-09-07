# Places passthrough and cache

CasinoDB does not expose a Google key to devices. The API is a **cache-first** proxy for Places API (New), and only stores fields needed to run the catalog.

## Operations

| CasinoDB | Google | Notes |
| --- | --- | --- |
| `GET /v1/casinos/nearby` | Nearby Search | `includedTypes: ["casino"]`, max 20, radius capped at 50 km (default 40 km) |
| `GET /v1/casinos/autocomplete` | Autocomplete | `includedPrimaryTypes: ["casino"]` |
| `GET /v1/casinos/:placeId` and writes that need a missing row | Place Details | Name, address, location, rating, types, phone, website, Maps URI, hours/status |

Place IDs are normalized by stripping a `places/` prefix if present.

## Cache-first policy

1. **Nearby:** look up `place_cache` for `(nearby, hash(round(lat,3), round(lng,3), radius))`.
   - Hit and not expired → query PostGIS only (`source: cache`).
   - Miss → call Google if `GOOGLE_PLACES_API_KEY` is set, upsert every returned place into `casinos` (and details cache), write the nearby cache, then query PostGIS (`source: google`).
   - Google missing or failing → PostGIS only (`source: database`). Empty list is a valid response; nearby does not 502.
2. **Autocomplete:** cache by normalized query string (TTL 1 hour). Miss with a configured key calls Google. If the key is unset, return `{ suggestions: [] }`. If the key is set and Google errors with no cache, **502** `places_unavailable`.
3. **Details:** a casino is stale when `fetched_at` is older than the details TTL (or null). Stale/missing rows refresh from Google. Failures fall back to the stored row. If there is no row and Google cannot hydrate, **404**.

Session start and intel POSTs call the same ensure path so a Place ID we have never seen still becomes a `casinos` row when Google (or a coordinate hint on session start) can fill it.

## Default TTLs

Override with env vars. Defaults match the product plan:

| Endpoint | Env | Default |
| --- | --- | --- |
| Details | `PLACES_DETAILS_TTL_SECONDS` | 7 days |
| Nearby | `PLACES_NEARBY_TTL_SECONDS` | 24 hours |
| Autocomplete | `PLACES_AUTOCOMPLETE_TTL_SECONDS` | 1 hour |

Coordinate rounding for nearby keys is 3 decimal degrees (~100 m) so adjacent requests share a cell.

## Fallback without a Google key

Leave `GOOGLE_PLACES_API_KEY` empty. Reads use Postgres only. Writes still work for Place IDs already in `casinos`, or session start with `coordinates` in the body (creates a stub row).

## Google ToS

- Store fields we need for the product (identity, location, contact, rating, hours).
- Do not dump or republish the Places database as a public clone.
- Cache with TTLs; `fetched_at` / `expires_at` record when Google was last contacted.
- `place_cache.payload` is an operational cache, not a distribution dump.

Field masks are listed in `apps/api/src/places/client.ts`.
