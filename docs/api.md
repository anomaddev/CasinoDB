# HTTP API

Base URL (local): `http://localhost:3000`

All `/v1` routes: `Authorization: Bearer <api_key>`. See [auth.md](auth.md).

Machine-readable contract: [openapi.yaml](openapi.yaml) (regenerate with `npm run docs:openapi`).

## Error shape

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Missing or invalid API key"
  }
}
```

| HTTP | `code` | Meaning |
| --- | --- | --- |
| 400 | `validation_error` | Query/body failed Zod |
| 401 | `unauthorized` | Missing/invalid/revoked key |
| 403 | `forbidden` | Missing scope |
| 404 | `not_found` | Unknown route or unknown Place ID |
| 502 | `places_unavailable` | Google required (autocomplete miss) and failed |
| 500 | `internal` | Unexpected |

## Casino JSON

List and detail payloads share this shape (intel summary included so clients can badge a pin without extra round-trips):

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "placeId": "ChIJX1234567890",
  "name": "MGM Grand",
  "address": "3799 S Las Vegas Blvd, Las Vegas, NV 89109",
  "coordinates": { "latitude": 36.1023, "longitude": -115.1696 },
  "googleRating": 4.4,
  "intel": {
    "backedOffLast90d": 2,
    "trespassedLast90d": 0,
    "lastIncidentAt": "2026-09-01T18:22:00.000Z",
    "currentTableCount": 3
  },
  "updatedAt": "2026-09-07T19:00:00.000Z"
}
```

## `GET /health`

No auth. Database ping.

```bash
curl http://localhost:3000/health
```

```json
{ "ok": true, "database": "up" }
```

## `GET /v1/casinos/nearby`

Scope: `read`.

| Query | Required | Notes |
| --- | --- | --- |
| `lat` | yes | |
| `lng` | yes | |
| `radius` | no | Meters, default `40000`, max `50000` |

Writes a `search` observation per returned casino.

```bash
curl -H "Authorization: Bearer $CASINODB_API_KEY" \
  'http://localhost:3000/v1/casinos/nearby?lat=36.12&lng=-115.17&radius=40000'
```

```json
{
  "casinos": [ { "placeId": "ChIJ…", "intel": { } } ],
  "source": "google"
}
```

`source` is `cache`, `google`, or `database` (see [places.md](places.md)).

## `GET /v1/casinos/autocomplete`

Scope: `read`. Query `q` (1–256 chars). Does not write observations (no Place Details yet).

```bash
curl -H "Authorization: Bearer $CASINODB_API_KEY" \
  'http://localhost:3000/v1/casinos/autocomplete?q=MGM'
```

```json
{
  "suggestions": [
    {
      "placeId": "ChIJ…",
      "displayName": "MGM Grand",
      "formattedAddress": "Las Vegas, NV"
    }
  ],
  "source": "google"
}
```

## `GET /v1/casinos/:placeId`

Scope: `read`. Refreshes Place Details if stale. Writes a `search` observation.

```bash
curl -H "Authorization: Bearer $CASINODB_API_KEY" \
  "http://localhost:3000/v1/casinos/$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' 'ChIJ…')"
```

```json
{ "casino": { "placeId": "ChIJ…", "intel": { } } }
```

## `POST /v1/casinos/:placeId/sessions`

Scope: `write:observations`. Upserts the casino, writes `event=session`. Body optional.

```bash
curl -X POST -H "Authorization: Bearer $CASINODB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MGM Grand",
    "address": "3799 S Las Vegas Blvd, Las Vegas, NV 89109",
    "coordinates": { "latitude": 36.1023, "longitude": -115.1696 }
  }' \
  http://localhost:3000/v1/casinos/ChIJX1234567890/sessions
```

```json
{
  "casino": { "placeId": "ChIJX1234567890" },
  "observed": "session"
}
```

HTTP 201.

## `POST /v1/casinos/:placeId/incidents`

Scope: `write:incidents`.

```bash
curl -X POST -H "Authorization: Bearer $CASINODB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "backed_off",
    "occurredAt": "2026-09-07T19:10:00.000Z",
    "sessionId": "abc",
    "externalAuthorId": "user-id-in-calling-app"
  }' \
  http://localhost:3000/v1/casinos/ChIJX1234567890/incidents
```

`kind`: `backed_off` | `trespassed`. Optional `notes`, `sessionId`, `externalAuthorId`.

Response (201) — no reporter or session id:

```json
{
  "incident": {
    "id": "…",
    "kind": "backed_off",
    "occurredAt": "2026-09-07T19:10:00.000Z",
    "notes": null
  }
}
```

## `GET /v1/casinos/:placeId/incidents`

Scope: `read`.

| Query | Notes |
| --- | --- |
| `since` | ISO datetime, inclusive |
| `kind` | `backed_off` or `trespassed` |
| `limit` | 1–200, default 50 |

```bash
curl -H "Authorization: Bearer $CASINODB_API_KEY" \
  'http://localhost:3000/v1/casinos/ChIJX1234567890/incidents?kind=backed_off'
```

```json
{ "incidents": [ { "id": "…", "kind": "backed_off", "occurredAt": "…", "notes": null } ] }
```

## `POST /v1/casinos/:placeId/conditions`

Scope: `write:conditions`.

```bash
curl -X POST -H "Authorization: Bearer $CASINODB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "eventKind": "seated",
    "reportedAt": "2026-09-07T19:12:00.000Z",
    "tableLabel": "BJ 12",
    "tableMinimum": 25,
    "tableMaximum": 1000,
    "betUnit": 50,
    "shuffle": "auto",
    "rules": {
      "deckCount": 6,
      "payout": "Standard",
      "standOnSoft17": true,
      "doubleAfterSplit": true,
      "surrender": "LateSurrender"
    },
    "externalAuthorId": "user-id-in-calling-app"
  }' \
  http://localhost:3000/v1/casinos/ChIJX1234567890/conditions
```

HTTP 201 `{ "condition": { … } }` — same public fields as GET (no author id).

`eventKind`: `seated` | `updated` | `departed`. `shuffle`: `hand` | `auto` | `constant`.

If `tableMaximum` is sent below `tableMinimum`, v1 does not reject it (clients may validate).

## `GET /v1/casinos/:placeId/conditions`

Scope: `read`.

| Query | Notes |
| --- | --- |
| `current` | `true` (default) or `false` |
| `limit` | 1–200, default 50 |

```bash
curl -H "Authorization: Bearer $CASINODB_API_KEY" \
  'http://localhost:3000/v1/casinos/ChIJX1234567890/conditions?current=true'
```

```json
{
  "conditions": [
    {
      "id": "…",
      "eventKind": "seated",
      "reportedAt": "2026-09-07T19:12:00.000Z",
      "tableLabel": "BJ 12",
      "tableMinimum": 25,
      "tableMaximum": 1000,
      "betUnit": 50,
      "shuffle": "auto",
      "rules": {
        "deckCount": 6,
        "payout": "Standard",
        "standOnSoft17": true,
        "doubleAfterSplit": true,
        "surrender": "LateSurrender"
      },
      "notes": null
    }
  ],
  "current": true
}
```

## `GET /v1/casinos/:placeId/reviews`

Scope: `read`. Returns `{ "reviews": [] }` until a write API exists. Review objects (when present) are `{ id, rating, body, createdAt }` — no author id.
