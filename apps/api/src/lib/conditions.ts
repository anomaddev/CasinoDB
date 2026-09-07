import { desc, eq } from "drizzle-orm";
import {
  DEFAULT_LIST_LIMIT,
  type PublicTableCondition,
  type ReportTableConditionBody,
  type TableRules,
} from "@casinodb/shared";
import { env } from "../env.js";
import { db, sql } from "../db/index.js";
import { tableConditions, type TableConditionRow } from "../db/schema.js";
import { reporterHash } from "./crypto.js";
import { ensureCasino } from "./casinos.js";
import { parseNumeric, toIso } from "./serialize.js";

function rulesFromRow(row: TableConditionRow): TableRules | null {
  const rules: TableRules = {};
  if (row.deckCount != null) rules.deckCount = row.deckCount;
  if (row.payout) rules.payout = row.payout as TableRules["payout"];
  if (row.standOnSoft17 != null) rules.standOnSoft17 = row.standOnSoft17;
  if (row.doubleAfterSplit != null) rules.doubleAfterSplit = row.doubleAfterSplit;
  if (row.surrender) rules.surrender = row.surrender as TableRules["surrender"];
  return Object.keys(rules).length > 0 ? rules : null;
}

export function toPublicCondition(row: TableConditionRow): PublicTableCondition {
  return {
    id: row.id,
    eventKind: row.eventKind as PublicTableCondition["eventKind"],
    reportedAt: toIso(row.reportedAt),
    tableLabel: row.tableLabel,
    tableMinimum: parseNumeric(row.tableMinimum),
    tableMaximum: parseNumeric(row.tableMaximum),
    betUnit: parseNumeric(row.betUnit),
    shuffle: (row.shuffle as PublicTableCondition["shuffle"]) ?? null,
    rules: rulesFromRow(row),
    notes: row.notes,
  };
}

export async function reportTableCondition(
  placeId: string,
  sourceApp: string,
  body: ReportTableConditionBody,
): Promise<PublicTableCondition> {
  const casino = await ensureCasino(placeId);
  const [row] = await db
    .insert(tableConditions)
    .values({
      casinoId: casino.id,
      reportedAt: new Date(body.reportedAt),
      sourceApp,
      reporterHash: reporterHash(sourceApp, body.externalAuthorId),
      eventKind: body.eventKind,
      tableLabel: body.tableLabel ?? null,
      tableMinimum: body.tableMinimum != null ? String(body.tableMinimum) : null,
      tableMaximum: body.tableMaximum != null ? String(body.tableMaximum) : null,
      betUnit: body.betUnit != null ? String(body.betUnit) : null,
      shuffle: body.shuffle ?? null,
      deckCount: body.rules?.deckCount ?? null,
      payout: body.rules?.payout ?? null,
      standOnSoft17: body.rules?.standOnSoft17 ?? null,
      doubleAfterSplit: body.rules?.doubleAfterSplit ?? null,
      surrender: body.rules?.surrender ?? null,
      notes: body.notes ?? null,
    })
    .returning();
  if (!row) throw new Error("Failed to insert table condition");
  return toPublicCondition(row);
}

export async function listTableConditions(
  placeId: string,
  options: { current: boolean; limit?: number },
): Promise<PublicTableCondition[]> {
  const casino = await ensureCasino(placeId);
  const limit = options.limit ?? DEFAULT_LIST_LIMIT;

  if (!options.current) {
    const rows = await db
      .select()
      .from(tableConditions)
      .where(eq(tableConditions.casinoId, casino.id))
      .orderBy(desc(tableConditions.reportedAt))
      .limit(limit);
    return rows.map(toPublicCondition);
  }

  const since = new Date(Date.now() - env.CURRENT_TABLE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const rows = await sql<Array<Record<string, unknown>>>`
    WITH ranked AS (
      SELECT
        tc.*,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(NULLIF(btrim(tc.table_label), ''), tc.id::text)
          ORDER BY tc.reported_at DESC
        ) AS rn
      FROM table_conditions tc
      WHERE tc.casino_id = ${casino.id}
        AND tc.reported_at >= ${since}::timestamptz
    )
    SELECT *
    FROM ranked
    WHERE rn = 1 AND event_kind <> 'departed'
    ORDER BY reported_at DESC
    LIMIT ${limit}
  `;

  return rows.map((row) =>
    toPublicCondition({
      id: String(row.id),
      casinoId: String(row.casino_id),
      reportedAt: new Date(String(row.reported_at)),
      sourceApp: String(row.source_app),
      reporterHash: row.reporter_hash == null ? null : String(row.reporter_hash),
      eventKind: String(row.event_kind),
      tableLabel: row.table_label == null ? null : String(row.table_label),
      tableMinimum: row.table_minimum == null ? null : String(row.table_minimum),
      tableMaximum: row.table_maximum == null ? null : String(row.table_maximum),
      betUnit: row.bet_unit == null ? null : String(row.bet_unit),
      shuffle: row.shuffle == null ? null : String(row.shuffle),
      deckCount: row.deck_count == null ? null : Number(row.deck_count),
      payout: row.payout == null ? null : String(row.payout),
      standOnSoft17: row.stand_on_soft_17 == null ? null : Boolean(row.stand_on_soft_17),
      doubleAfterSplit:
        row.double_after_split == null ? null : Boolean(row.double_after_split),
      surrender: row.surrender == null ? null : String(row.surrender),
      notes: row.notes == null ? null : String(row.notes),
      createdAt: new Date(String(row.created_at)),
    }),
  );
}
