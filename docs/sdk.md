# TypeScript SDK

Package: `@casinodb/sdk` (workspace path `packages/sdk`). Depends on `@casinodb/shared` for request/response types.

Not published to npm in v1. In this repo:

```bash
npm install
npm run build -w @casinodb/shared -w @casinodb/sdk
```

From another app in a monorepo, depend on the workspace package. HTTP clients that are not TypeScript can use [api.md](api.md) / [openapi.yaml](openapi.yaml) instead.

## Configure

```ts
import { CasinoDBClient, CasinoDBError } from "@casinodb/sdk";

const db = new CasinoDBClient({
  baseUrl: "http://localhost:3000",
  apiKey: process.env.CASINODB_API_KEY!,
});
```

Optional `fetch` override for tests or React Native.

Failed responses throw `CasinoDBError` with `status`, `code`, `message`, and optional `details`.

## Methods

### `health()` — no API key sent

```ts
await db.health();
// { ok: true, database: "up" }
```

### `searchNearby({ lat, lng, radius? })`

```ts
const { casinos, source } = await db.searchNearby({
  lat: 36.12,
  lng: -115.17,
  radius: 40_000,
});
for (const casino of casinos) {
  console.log(casino.name, casino.intel.backedOffLast90d);
}
```

### `autocomplete(q)`

```ts
const { suggestions } = await db.autocomplete("MGM");
// suggestions[0].placeId, displayName, formattedAddress
```

### `getCasino(placeId)`

```ts
const { casino } = await db.getCasino("ChIJX1234567890");
```

### `startSession(placeId, body?)`

```ts
const { casino, observed } = await db.startSession("ChIJX1234567890", {
  name: "MGM Grand",
  address: "3799 S Las Vegas Blvd, Las Vegas, NV 89109",
  coordinates: { latitude: 36.1023, longitude: -115.1696 },
});
// observed === "session"
```

Requires scope `write:observations`.

### `reportIncident(placeId, body)`

```ts
const { incident } = await db.reportIncident("ChIJX1234567890", {
  kind: "backed_off",
  occurredAt: new Date().toISOString(),
  sessionId: "abc",
  externalAuthorId: "user-id-in-calling-app",
});
// incident has id, kind, occurredAt, notes — never the author or session id
```

Requires scope `write:incidents`. Trespass: `kind: "trespassed"`.

### `listIncidents(placeId, query?)`

```ts
const { incidents } = await db.listIncidents("ChIJX1234567890", {
  kind: "backed_off",
  since: "2026-01-01T00:00:00.000Z",
  limit: 50,
});
```

### `reportTableCondition(placeId, body)`

```ts
const { condition } = await db.reportTableCondition("ChIJX1234567890", {
  eventKind: "seated",
  reportedAt: new Date().toISOString(),
  tableLabel: "BJ 12",
  tableMinimum: 25,
  tableMaximum: 1000,
  betUnit: 50,
  shuffle: "auto",
  rules: {
    deckCount: 6,
    payout: "Standard",
    standOnSoft17: true,
    doubleAfterSplit: true,
    surrender: "LateSurrender",
  },
  externalAuthorId: "user-id-in-calling-app",
});
```

Requires scope `write:conditions`. Leave a table with `eventKind: "departed"` so it drops out of the current set.

### `listTableConditions(placeId, query?)`

```ts
const current = await db.listTableConditions("ChIJX1234567890");
const history = await db.listTableConditions("ChIJX1234567890", { current: false });
```

### `listReviews(placeId)`

```ts
const { reviews } = await db.listReviews("ChIJX1234567890");
// [] until review writes exist
```

## Auth header

The client sets `Authorization: Bearer <apiKey>` on every `/v1` call. `source_app` is not a client parameter; the server stamps it from the key.
