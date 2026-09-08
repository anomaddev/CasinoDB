# Architecture

CasinoDB is a standalone platform. Client apps (mobile, web, or servers) call the same HTTP API with a per-app key. Nothing in the contract is tied to a specific product.

## Canonical identity

Venues are keyed by **Google Place ID** (`ChIJ…`). CasinoDB also assigns an internal UUID (`casinos.id`) for foreign keys. Clients should send and store Place IDs.

What belongs in CasinoDB vs in the client app:

| In CasinoDB | Stays in the client |
| --- | --- |
| Venue catalog (name, address, coordinates, Google rating) | Per-user favorites |
| Search and session *observations* (that a venue was used) | The user’s full session, bankroll, P/L |
| Shared incidents (backed off / trespassed) | Who the user is; private incident history |
| Shared table condition reports | Live table UI state |
| Reviews (table reserved; writes later) | App-specific accounts |

## Request flows

### Search / session

1. Client calls nearby, autocomplete, or details (SDK or HTTP).
2. API answers from Postgres when the area or place is fresh.
3. On miss or stale TTL, call Google Places API (New), upsert `casinos` + `place_cache`, return CasinoDB’s shape.
4. Nearby results and details writes `observations` with `event=search`. Session select writes `event=session`. `source_app` is taken from the API key.

### Crowd-sourced intel

1. Any authorized app POSTs an incident or table condition.
2. API upserts the casino if needed (Places details, or a coordinate hint on session start).
3. All clients with `read` can GET anonymized incidents and current table conditions. Writes from one app are visible to every other app.

```
Client app  →  SDK / HTTP  →  API key auth  →  Hono /v1
                                          ↘  PostGIS catalog
                                          ↘  Places (on miss/stale)
                                          ↘  incidents / table_conditions
```

## Packages

- `@casinodb/api` — Node 22 + Hono + Drizzle + `postgres`
- `@casinodb/shared` — Zod request/response contracts
- `@casinodb/sdk` — fetch wrapper over `/v1`

Hosting is **not** on the same process as any consumer app. Production HTTP is `https://casinodb.cardcountingcoach.com`. Postgres + PostGIS is a separate database (Hostinger website MySQL cannot run nearby search). See [deploy.md](deploy.md).
