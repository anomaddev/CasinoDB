CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE casinos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL UNIQUE,
  name text NOT NULL,
  formatted_address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  location geography(Point, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  google_rating double precision,
  google_user_ratings_total integer,
  types text[] NOT NULL DEFAULT '{}'::text[],
  phone text,
  website text,
  google_maps_uri text,
  fetched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX casinos_location_gix ON casinos USING GIST (location);

CREATE TABLE place_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  cache_key text NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  UNIQUE (endpoint, cache_key)
);

CREATE INDEX place_cache_expires_at_idx ON place_cache (expires_at);

CREATE TABLE api_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_app text NOT NULL UNIQUE,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  casino_id uuid NOT NULL REFERENCES casinos (id) ON DELETE CASCADE,
  event text NOT NULL,
  source_app text NOT NULL,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX observations_casino_created_idx ON observations (casino_id, created_at DESC);

CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  casino_id uuid NOT NULL REFERENCES casinos (id) ON DELETE CASCADE,
  kind text NOT NULL,
  occurred_at timestamptz NOT NULL,
  source_app text NOT NULL,
  reporter_hash text,
  external_session_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX incidents_casino_kind_occurred_idx ON incidents (casino_id, kind, occurred_at DESC);

CREATE TABLE table_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  casino_id uuid NOT NULL REFERENCES casinos (id) ON DELETE CASCADE,
  reported_at timestamptz NOT NULL,
  source_app text NOT NULL,
  reporter_hash text,
  event_kind text NOT NULL,
  table_label text,
  table_minimum numeric,
  table_maximum numeric,
  bet_unit numeric,
  shuffle text,
  deck_count integer,
  payout text,
  stand_on_soft_17 boolean,
  double_after_split boolean,
  surrender text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX table_conditions_casino_reported_idx ON table_conditions (casino_id, reported_at DESC);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  casino_id uuid NOT NULL REFERENCES casinos (id) ON DELETE CASCADE,
  source_app text NOT NULL,
  external_author_id text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_app, external_author_id, casino_id)
);

CREATE TABLE casino_status (
  casino_id uuid PRIMARY KEY REFERENCES casinos (id) ON DELETE CASCADE,
  business_status text,
  open_now boolean,
  regular_hours jsonb,
  source text NOT NULL DEFAULT 'google_places',
  updated_at timestamptz NOT NULL DEFAULT now()
);
