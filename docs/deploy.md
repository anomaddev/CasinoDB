# Deploy

Production origin: **https://casinodb.cardcountingcoach.com**

The marketing site stays on `cardcountingcoach.com`. CasinoDB is a Node 22 process on the `casinodb` subdomain plus a **PostgreSQL + PostGIS** database. Hostinger website databases are MySQL — they cannot back nearby search.

## What is already in DNS

`casinodb.cardcountingcoach.com` already resolves on Hostinger (`ns1`/`ns2.dns-parking.com`) and serves TLS. Until Node.js is enabled and this repo is deployed, the host shows the default hPanel page.

## 1. Postgres + PostGIS

Provision Postgres 16+ with the `postgis` extension (Supabase, Neon, or a VPS). Then from this repo, with production `DATABASE_URL` and `API_KEY_PEPPER` in the environment:

```bash
npm install
npm run db:migrate
npm run keys:create -- --name "Card Counting Coach" --source-app card-counting-coach
```

Keep the printed API key in the consumer app. Do not rotate `API_KEY_PEPPER` after keys exist.

## 2. Hostinger Node.js

On the website for `casinodb.cardcountingcoach.com` (Business/Cloud plan with Node.js):

1. Switch the site from PHP to **Node.js** if it is still a default PHP document root.
2. Set environment variables in hPanel (Node.js → Environment). The Hostinger deploy API does not set these.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres URL with PostGIS |
| `API_KEY_PEPPER` | yes | Long random string; stable |
| `GOOGLE_PLACES_API_KEY` | for live Places | Empty = cache-only |
| `HOST` | no | Defaults to `0.0.0.0` |
| `PORT` | no | Hostinger injects this |

3. Build settings (override if auto-detect is wrong):

| Setting | Value |
| --- | --- |
| Node version | `22` |
| Package manager | `npm` |
| Build command | `npm run build` |
| Start / entry | `npm start` → `apps/api/dist/index.js` |
| `app_type` | omit (Hono is not in Hostinger’s preset list) |

Do not upload `.env` or `node_modules`. Root `package.json` already has `build` (workspaces) and `start`.

After a deploy, `GET https://casinodb.cardcountingcoach.com/health` should return:

```json
{ "ok": true, "database": "up" }
```

## 3. Clients

```ts
new CasinoDBClient({
  baseUrl: "https://casinodb.cardcountingcoach.com",
  apiKey: process.env.CASINODB_API_KEY!,
});
```

Restrict the Google Places **server** key to Places API (New). Shared hosting egress IPs are often not stable enough for IP lock-down.
