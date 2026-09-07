# Agent and contributor handbook

CasinoDB is a **multi-app platform API**. Do not couple the contract to Card Counting Coach, Firebase, or any other product. `source_app` + API key is how clients identify themselves.

## Docs with code

Every feature lands with its matching documentation in the same change.

| You changed | Also update |
| --- | --- |
| HTTP route or error code | `docs/api.md` and regenerate `docs/openapi.yaml` (`npm run docs:openapi`) |
| Zod contract | `packages/shared` and those two docs |
| SQL / Drizzle schema | `drizzle/*.sql` **and** `docs/schema.md` |
| Cache TTL, Places fields, fallback | `docs/places.md` |
| Incident/condition privacy or freshness | `docs/intel.md` |
| Key/scope behavior | `docs/auth.md` |
| SDK method | `packages/sdk` **and** `docs/sdk.md` |

Do not ship an undocumented endpoint, table, or cache rule.

## Privacy

Public GET never returns `reporter_hash`, `externalAuthorId`, `external_session_id`, or `source_app` on intel rows. Hash reporters with `reporterHash()`; do not invent a parallel identity scheme.

## Cache

Cache-first: Postgres, then Google Places API (New) on miss/stale. Respect TTLs in env / `packages/shared` constants. Do not add a “download all casinos” export.

## Schema conventions

- Canonical client id: Google Place ID; internal FK: `casinos.id` UUID.
- Extensible kinds (`incidents.kind`) stay **text**, validated in Zod — not Postgres enums.
- House rules live on `table_conditions`, not on `casinos`.
- New tables need a migration in `drizzle/` applied via `npm run db:migrate`.

## Stack

Node 22, TypeScript ESM, Hono, Zod, Drizzle, PostgreSQL 16 + PostGIS, npm workspaces (`apps/api`, `packages/sdk`, `packages/shared`).

## Out of scope until explicitly asked

Integrating a consumer app, review writes, billing, self-serve key dashboard, npm publish, showing who was backed off.
