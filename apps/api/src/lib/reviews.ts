import { desc, eq } from "drizzle-orm";
import { DEFAULT_LIST_LIMIT, type PublicReview } from "@casinodb/shared";
import { db } from "../db/index.js";
import { reviews } from "../db/schema.js";
import { ensureCasino } from "./casinos.js";
import { toIso } from "./serialize.js";

export async function listReviews(placeId: string, limit = DEFAULT_LIST_LIMIT): Promise<PublicReview[]> {
  const casino = await ensureCasino(placeId);
  const rows = await db
    .select()
    .from(reviews)
    .where(eq(reviews.casinoId, casino.id))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    body: row.body,
    createdAt: toIso(row.createdAt),
  }));
}
