# CasinoDB documentation

CasinoDB is a **multi-app** HTTP API: Places-backed casino rows in PostgreSQL, plus crowd-sourced intel that every authorized client can read.

## For API consumers

1. [Architecture](architecture.md) — how apps, keys, cache, and intel fit together
2. [Authentication](auth.md) — API keys, scopes, `source_app`
3. [HTTP API](api.md) — every route, example bodies, error codes
4. [OpenAPI](openapi.yaml) — machine-readable contract
5. [SDK](sdk.md) — TypeScript client
6. [Intel privacy](intel.md) — incidents, table conditions, anonymous public reads

## For contributors

1. [Schema](schema.md) — tables, columns, indexes, enums
2. [Places cache](places.md) — Google passthrough, TTLs, ToS
3. [AGENTS.md](../AGENTS.md) — conventions: docs-with-code, no app-specific coupling

## Local run

See the root [README.md](../README.md).
