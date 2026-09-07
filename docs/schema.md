# Schema

PostgreSQL 16 + PostGIS. Migrations live in [`drizzle/`](../drizzle/) and are applied with `npm run db:migrate`. Update this file in the same change as any new migration.

Types that clients send are validated in Zod (`packages/shared`). Database columns for kinds use **text** (not Postgres enums) so new incident kinds can be added without a rewrite.

## `casinos`

Foundation row. One per Google Place ID.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | Internal id |
| `place_id` | text unique not null | Google Place ID |
| `name` | text not null | |
| `formatted_address` | text not null | |
| `latitude`, `longitude` | double precision not null | WGS84 |
| `location` | geography(Point, 4326) | Generated from lon/lat; GIST index `casinos_location_gix` |
| `google_rating` | double precision | Nullable |
| `google_user_ratings_total` | integer | Nullable |
| `types` | text[] | Default `{}` |
| `phone`, `website`, `google_maps_uri` | text | Nullable |
| `fetched_at` | timestamptz | Last successful Places hydration |
| `created_at`, `updated_at` | timestamptz | |

Nearby search: `ST_DWithin(location, …, radius_meters)`.

House rules are **not** stored here. They live on `table_conditions` so two tables in the same pit can disagree.

## `place_cache`

Raw-ish cached Places responses, keyed by endpoint + hash (not a single `place_id` PK, because nearby and autocomplete are query-shaped).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `endpoint` | text not null | `nearby` \| `details` \| `autocomplete` |
| `cache_key` | text not null | Place ID (details) or SHA-256 of the query |
| `payload` | jsonb not null | |
| `fetched_at`, `expires_at` | timestamptz | |

Unique `(endpoint, cache_key)`. Index on `expires_at`.

## `api_clients`

One row per consuming app.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `name` | text not null | Human label |
| `source_app` | text unique not null | Stable slug stamped on writes |
| `key_hash` | text unique not null | HMAC-SHA256 of the secret |
| `scopes` | text[] not null | See [auth.md](auth.md) |
| `created_at` | timestamptz | |
| `revoked_at` | timestamptz | Null = active |

## `observations`

Catalog signal: this app searched or started a session at this venue.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `casino_id` | uuid FK → casinos | ON DELETE CASCADE |
| `event` | text not null | `search` \| `session` |
| `source_app` | text not null | From the API key |
| `latitude`, `longitude` | double precision | Query location when known |
| `created_at` | timestamptz | |

Index `(casino_id, created_at DESC)`.

## `incidents`

Shared backed-off / trespassed events.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `casino_id` | uuid FK → casinos | CASCADE |
| `kind` | text not null | `backed_off` \| `trespassed` (extensible) |
| `occurred_at` | timestamptz not null | |
| `source_app` | text not null | |
| `reporter_hash` | text | HMAC(`source_app:external_author_id`); **never returned** |
| `external_session_id` | text | Client session id; **never returned** |
| `notes` | text | May be returned |
| `created_at` | timestamptz | |

Index `(casino_id, kind, occurred_at DESC)`.

## `table_conditions`

Crowd-sourced floor reports.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `casino_id` | uuid FK → casinos | CASCADE |
| `reported_at` | timestamptz not null | |
| `source_app` | text not null | |
| `reporter_hash` | text | Same HMAC rule; never returned |
| `event_kind` | text not null | `seated` \| `updated` \| `departed` |
| `table_label` | text | |
| `table_minimum`, `table_maximum`, `bet_unit` | numeric | |
| `shuffle` | text | `hand` \| `auto` \| `constant` |
| `deck_count` | integer | |
| `payout` | text | `Standard` \| `SixToFive` |
| `stand_on_soft_17`, `double_after_split` | boolean | |
| `surrender` | text | `Off` \| `LateSurrender` \| `EarlySurrender` |
| `notes` | text | |
| `created_at` | timestamptz | |

Index `(casino_id, reported_at DESC)`.

**Current** set: latest row per table (label, or id if unlabeled) with `reported_at` inside the freshness window (default 24 hours) whose `event_kind` is not `departed`.

## `reviews`

Reserved for a future write API. One review per `(source_app, external_author_id, casino_id)`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `casino_id` | uuid FK → casinos | CASCADE |
| `source_app` | text not null | |
| `external_author_id` | text not null | Client user id (stored for uniqueness; list API omits it) |
| `rating` | integer | 1–5 check |
| `body` | text | |
| `created_at` | timestamptz | |

## `casino_status`

Google-sourced hours / business status. Separate from player intel.

| Column | Type | Notes |
| --- | --- | --- |
| `casino_id` | uuid PK/FK → casinos | CASCADE |
| `business_status` | text | |
| `open_now` | boolean | |
| `regular_hours` | jsonb | Places `regularOpeningHours` |
| `source` | text | Default `google_places` |
| `updated_at` | timestamptz | |

Not included on the default casino JSON payload in v1.

## `schema_migrations`

Applied SQL filenames. Owned by `apps/api/src/scripts/migrate.ts`.
