# Crowd-sourced intel

CasinoDB is a **shared** feed. An incident or table report posted by one app is visible to every app with `read`.

Private per-user history (favorites, “I was backed off here”) stays in the client. CasinoDB only answers: *did this happen at this venue, and what does the floor look like right now?*

## Privacy

Public GET responses **never** include:

- `reporter_hash`
- `externalAuthorId`
- client `sessionId` / `external_session_id`
- which `source_app` wrote the row

Those values may be stored for dedupe and abuse review.

`externalAuthorId` is HMAC’d with `API_KEY_PEPPER` as `source_app:externalAuthorId` before insert. Notes are optional and **are** returned; clients should not put names or account ids in `notes`.

We do not show **who** was backed off or trespassed — only that it happened, when, and optional notes.

## Incidents

Kinds in v1: `backed_off`, `trespassed`. Additional kinds can be added later (column is text).

Casino summaries include:

- `backedOffLast90d` / `trespassedLast90d` (window: `INCIDENT_SUMMARY_DAYS`, default 90)
- `lastIncidentAt` (max `occurred_at` for that venue, any time)
- `currentTableCount`

## Table conditions

Reports are sit / update / leave (`seated`, `updated`, `departed`) plus optional limits, shuffle, and blackjack rules.

**Current** (default `GET ?current=true`):

- `reported_at` within `CURRENT_TABLE_WINDOW_HOURS` (default 24)
- latest row per table label (unlabeled rows are each their own table)
- drop the table if that latest row is `departed`

`?current=false` returns history, newest first.

Rules are **not** a single truth column on `casinos`. Two reports can disagree (one 6:5 table, one 3:2).

## Cross-app visibility

Reads are not filtered by `source_app`. That is the platform: intel compounds across clients.
