# Authentication and API clients

Every `/v1` route requires:

```
Authorization: Bearer <api_key>
```

`GET /health` has no auth.

## Model

Each consuming app is one row in `api_clients`:

- `name` — display label
- `source_app` — stable slug written onto observations, incidents, and conditions
- `key_hash` — HMAC-SHA256 of the raw key using `API_KEY_PEPPER`
- `scopes` — list of granted scopes
- `revoked_at` — set to disable the key

**`source_app` is taken from the key, never from the request body.** Apps cannot spoof each other.

Raw keys are shown once at creation. Prefix is `cdb_`.

## Scopes

| Scope | Routes |
| --- | --- |
| `read` | Nearby, autocomplete, get casino, list incidents/conditions/reviews |
| `write:observations` | `POST /v1/casinos/:placeId/sessions` |
| `write:incidents` | `POST /v1/casinos/:placeId/incidents` |
| `write:conditions` | `POST /v1/casinos/:placeId/conditions` |

Issue a local key with all scopes:

```bash
npm run keys:create -- --name "Local Dev" --source-app dev
```

Subset of scopes:

```bash
npm run keys:create -- --name "Read only" --source-app maps-web --scopes read
```

Rotate (invalidates the previous secret for that `source_app`):

```bash
npm run keys:create -- --source-app dev --rotate
```

Self-serve key dashboard and billing are out of scope for v1.

## Errors

| HTTP | `error.code` | When |
| --- | --- | --- |
| 401 | `unauthorized` | Missing, unknown, or revoked key |
| 403 | `forbidden` | Key valid but missing the required scope |

There is no user login. Client apps authenticate *their* users themselves and may send `externalAuthorId` on writes so CasinoDB can HMAC a reporter hash for dedupe. That hash is never returned on GET.
