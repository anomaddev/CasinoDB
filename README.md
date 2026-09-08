# CasinoDB

A standalone, multi-app platform API for a **casino catalog** (Google Places–backed, cached in PostgreSQL) plus **crowd-sourced floor intel** (backed off, trespassed, table conditions). Any authorized client app can read and write. Card Counting Coach is only the first known consumer — the contract is generic.

Canonical venue id is the **Google Place ID**. Production HTTP: [https://casinodb.cardcountingcoach.com](https://casinodb.cardcountingcoach.com).

## Quick start

```bash
cp .env.example .env
# Set API_KEY_PEPPER to a long random string.
# Optionally set GOOGLE_PLACES_API_KEY (cache-only mode works without it).

npm install
npm run db:up
npm run db:migrate
npm run keys:create -- --name "Local Dev" --source-app dev
npm run dev
```

`npm run db:up` starts PostgreSQL 16 + PostGIS in Docker. The official PostGIS image is `linux/amd64`; Docker Desktop emulates it on Apple silicon.

Health check (no auth):

```bash
curl http://localhost:3000/health
```

Authenticated example (use the key printed by `keys:create`):

```bash
export CASINODB_API_KEY='cdb_…'
curl -H "Authorization: Bearer $CASINODB_API_KEY" \
  'http://localhost:3000/v1/casinos/nearby?lat=36.12&lng=-115.17&radius=40000'
```

## Repository layout

| Path | Role |
| --- | --- |
| `apps/api` | Hono HTTP server |
| `packages/sdk` | Typed TypeScript client |
| `packages/shared` | Zod contracts and constants |
| `drizzle/` | SQL migrations |
| `docs/` | Platform documentation |

## Documentation

Start at [docs/README.md](docs/README.md). Production deploy: [docs/deploy.md](docs/deploy.md).

## Environment

See [.env.example](.env.example). Required for the API: `DATABASE_URL`, `API_KEY_PEPPER`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run db:up` | Start PostGIS via Docker Compose |
| `npm run db:migrate` | Apply SQL in `drizzle/` |
| `npm run keys:create` | Issue a hashed API key (prints the secret once) |
| `npm run start` | Run the compiled API (`apps/api/dist/index.js`) |
| `npm run dev` | Build shared contracts and watch the API |
| `npm run build` | Compile shared, SDK, and API |
| `npm run docs:openapi` | Regenerate `docs/openapi.yaml` |

## License

Private unless a license file is added later.
