import type { ObservationEvent } from "@casinodb/shared";
import { db } from "../db/index.js";
import { observations } from "../db/schema.js";

export async function recordObservations(
  casinoIds: string[],
  event: ObservationEvent,
  sourceApp: string,
  coordinates?: { latitude: number; longitude: number },
): Promise<void> {
  if (casinoIds.length === 0) return;
  await db.insert(observations).values(
    casinoIds.map((casinoId) => ({
      casinoId,
      event,
      sourceApp,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    })),
  );
}
