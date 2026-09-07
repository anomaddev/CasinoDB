import { and, desc, eq, gte } from "drizzle-orm";
import {
  DEFAULT_LIST_LIMIT,
  type ListIncidentsQuery,
  type PublicIncident,
  type ReportIncidentBody,
} from "@casinodb/shared";
import { db } from "../db/index.js";
import { incidents, type IncidentRow } from "../db/schema.js";
import { reporterHash } from "./crypto.js";
import { ensureCasino } from "./casinos.js";
import { toIso } from "./serialize.js";

export function toPublicIncident(row: IncidentRow): PublicIncident {
  return {
    id: row.id,
    kind: row.kind as PublicIncident["kind"],
    occurredAt: toIso(row.occurredAt),
    notes: row.notes,
  };
}

export async function reportIncident(
  placeId: string,
  sourceApp: string,
  body: ReportIncidentBody,
): Promise<PublicIncident> {
  const casino = await ensureCasino(placeId);
  const [row] = await db
    .insert(incidents)
    .values({
      casinoId: casino.id,
      kind: body.kind,
      occurredAt: new Date(body.occurredAt),
      sourceApp,
      reporterHash: reporterHash(sourceApp, body.externalAuthorId),
      externalSessionId: body.sessionId ?? null,
      notes: body.notes ?? null,
    })
    .returning();
  if (!row) throw new Error("Failed to insert incident");
  return toPublicIncident(row);
}

export async function listIncidents(
  placeId: string,
  query: ListIncidentsQuery,
): Promise<PublicIncident[]> {
  const casino = await ensureCasino(placeId);
  const limit = query.limit ?? DEFAULT_LIST_LIMIT;
  const filters = [eq(incidents.casinoId, casino.id)];
  if (query.kind) filters.push(eq(incidents.kind, query.kind));
  if (query.since) filters.push(gte(incidents.occurredAt, new Date(query.since)));

  const rows = await db
    .select()
    .from(incidents)
    .where(and(...filters))
    .orderBy(desc(incidents.occurredAt))
    .limit(limit);
  return rows.map(toPublicIncident);
}
