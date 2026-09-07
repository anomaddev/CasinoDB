import { z } from "zod";

/** Accepts any Date-parseable ISO-8601 string, including milliseconds and Z. */
export const isoDateTimeSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid ISO-8601 datetime",
  });

export const coordinatesSchema = z.object({
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
});
export type Coordinates = z.infer<typeof coordinatesSchema>;

export const intelSummarySchema = z.object({
  backedOffLast90d: z.number().int().nonnegative(),
  trespassedLast90d: z.number().int().nonnegative(),
  lastIncidentAt: isoDateTimeSchema.nullable(),
  currentTableCount: z.number().int().nonnegative(),
});
export type IntelSummary = z.infer<typeof intelSummarySchema>;

export const EMPTY_INTEL: IntelSummary = {
  backedOffLast90d: 0,
  trespassedLast90d: 0,
  lastIncidentAt: null,
  currentTableCount: 0,
};

export const casinoSchema = z.object({
  id: z.string().uuid(),
  placeId: z.string().min(1),
  name: z.string(),
  address: z.string(),
  coordinates: coordinatesSchema,
  googleRating: z.number().nullable(),
  intel: intelSummarySchema,
  updatedAt: isoDateTimeSchema,
});
export type Casino = z.infer<typeof casinoSchema>;

export const casinoHintSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  coordinates: coordinatesSchema.optional(),
});
export type CasinoHint = z.infer<typeof casinoHintSchema>;
