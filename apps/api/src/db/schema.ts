import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const casinos = pgTable("casinos", {
  id: uuid("id").primaryKey().defaultRandom(),
  placeId: text("place_id").notNull().unique(),
  name: text("name").notNull(),
  formattedAddress: text("formatted_address").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  googleRating: doublePrecision("google_rating"),
  googleUserRatingsTotal: integer("google_user_ratings_total"),
  types: text("types").array().notNull().default([]),
  phone: text("phone"),
  website: text("website"),
  googleMapsUri: text("google_maps_uri"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const placeCache = pgTable(
  "place_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    endpoint: text("endpoint").notNull(),
    cacheKey: text("cache_key").notNull(),
    payload: jsonb("payload").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("place_cache_endpoint_cache_key").on(table.endpoint, table.cacheKey),
    index("place_cache_expires_at_idx").on(table.expiresAt),
  ],
);

export const apiClients = pgTable("api_clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  sourceApp: text("source_app").notNull().unique(),
  keyHash: text("key_hash").notNull().unique(),
  scopes: text("scopes").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const observations = pgTable(
  "observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    casinoId: uuid("casino_id")
      .notNull()
      .references(() => casinos.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    sourceApp: text("source_app").notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("observations_casino_created_idx").on(table.casinoId, table.createdAt)],
);

export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    casinoId: uuid("casino_id")
      .notNull()
      .references(() => casinos.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    sourceApp: text("source_app").notNull(),
    reporterHash: text("reporter_hash"),
    externalSessionId: text("external_session_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("incidents_casino_kind_occurred_idx").on(table.casinoId, table.kind, table.occurredAt),
  ],
);

export const tableConditions = pgTable(
  "table_conditions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    casinoId: uuid("casino_id")
      .notNull()
      .references(() => casinos.id, { onDelete: "cascade" }),
    reportedAt: timestamp("reported_at", { withTimezone: true }).notNull(),
    sourceApp: text("source_app").notNull(),
    reporterHash: text("reporter_hash"),
    eventKind: text("event_kind").notNull(),
    tableLabel: text("table_label"),
    tableMinimum: numeric("table_minimum"),
    tableMaximum: numeric("table_maximum"),
    betUnit: numeric("bet_unit"),
    shuffle: text("shuffle"),
    deckCount: integer("deck_count"),
    payout: text("payout"),
    standOnSoft17: boolean("stand_on_soft_17"),
    doubleAfterSplit: boolean("double_after_split"),
    surrender: text("surrender"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("table_conditions_casino_reported_idx").on(table.casinoId, table.reportedAt),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    casinoId: uuid("casino_id")
      .notNull()
      .references(() => casinos.id, { onDelete: "cascade" }),
    sourceApp: text("source_app").notNull(),
    externalAuthorId: text("external_author_id").notNull(),
    rating: integer("rating").notNull(),
    body: text("body"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("reviews_source_author_casino").on(
      table.sourceApp,
      table.externalAuthorId,
      table.casinoId,
    ),
  ],
);

export const casinoStatus = pgTable("casino_status", {
  casinoId: uuid("casino_id")
    .primaryKey()
    .references(() => casinos.id, { onDelete: "cascade" }),
  businessStatus: text("business_status"),
  openNow: boolean("open_now"),
  regularHours: jsonb("regular_hours"),
  source: text("source").notNull().default("google_places"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CasinoRow = typeof casinos.$inferSelect;
export type NewCasinoRow = typeof casinos.$inferInsert;
export type ApiClientRow = typeof apiClients.$inferSelect;
export type IncidentRow = typeof incidents.$inferSelect;
export type TableConditionRow = typeof tableConditions.$inferSelect;
export type ReviewRow = typeof reviews.$inferSelect;
