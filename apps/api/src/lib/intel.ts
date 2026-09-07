import type { Casino, IntelSummary } from "@casinodb/shared";
import { EMPTY_INTEL } from "@casinodb/shared";
import { env } from "../env.js";
import { sql } from "../db/index.js";
import type { CasinoRow } from "../db/schema.js";
import { toIso } from "./serialize.js";

type IncidentAgg = {
  casino_id: string;
  backed_off: number;
  trespassed: number;
  last_incident_at: Date | null;
};

type TableAgg = {
  casino_id: string;
  current_table_count: number;
};

export async function intelForCasinos(casinoIds: string[]): Promise<Map<string, IntelSummary>> {
  const map = new Map<string, IntelSummary>();
  if (casinoIds.length === 0) return map;

  const sinceIncidents = new Date(
    Date.now() - env.INCIDENT_SUMMARY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const sinceConditions = new Date(
    Date.now() - env.CURRENT_TABLE_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const incidentRows = await sql<IncidentAgg[]>`
    SELECT
      casino_id,
      COUNT(*) FILTER (
        WHERE kind = 'backed_off' AND occurred_at >= ${sinceIncidents}::timestamptz
      )::int AS backed_off,
      COUNT(*) FILTER (
        WHERE kind = 'trespassed' AND occurred_at >= ${sinceIncidents}::timestamptz
      )::int AS trespassed,
      MAX(occurred_at) AS last_incident_at
    FROM incidents
    WHERE casino_id = ANY(${casinoIds}::uuid[])
    GROUP BY casino_id
  `;

  const tableRows = await sql<TableAgg[]>`
    WITH ranked AS (
      SELECT
        casino_id,
        event_kind,
        ROW_NUMBER() OVER (
          PARTITION BY casino_id, COALESCE(NULLIF(btrim(table_label), ''), id::text)
          ORDER BY reported_at DESC
        ) AS rn
      FROM table_conditions
      WHERE casino_id = ANY(${casinoIds}::uuid[])
        AND reported_at >= ${sinceConditions}::timestamptz
    )
    SELECT casino_id, COUNT(*)::int AS current_table_count
    FROM ranked
    WHERE rn = 1 AND event_kind <> 'departed'
    GROUP BY casino_id
  `;

  for (const id of casinoIds) {
    map.set(id, { ...EMPTY_INTEL });
  }
  for (const row of incidentRows) {
    const current = map.get(row.casino_id) ?? { ...EMPTY_INTEL };
    current.backedOffLast90d = row.backed_off;
    current.trespassedLast90d = row.trespassed;
    current.lastIncidentAt = row.last_incident_at ? toIso(row.last_incident_at) : null;
    map.set(row.casino_id, current);
  }
  for (const row of tableRows) {
    const current = map.get(row.casino_id) ?? { ...EMPTY_INTEL };
    current.currentTableCount = row.current_table_count;
    map.set(row.casino_id, current);
  }
  return map;
}

export function toPublicCasino(row: CasinoRow, intel: IntelSummary): Casino {
  return {
    id: row.id,
    placeId: row.placeId,
    name: row.name,
    address: row.formattedAddress,
    coordinates: {
      latitude: row.latitude,
      longitude: row.longitude,
    },
    googleRating: row.googleRating,
    intel,
    updatedAt: toIso(row.updatedAt),
  };
}

export async function toPublicCasinos(rows: CasinoRow[]): Promise<Casino[]> {
  const intel = await intelForCasinos(rows.map((row) => row.id));
  return rows.map((row) => toPublicCasino(row, intel.get(row.id) ?? { ...EMPTY_INTEL }));
}
