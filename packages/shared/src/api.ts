import { z } from "zod";
import { casinoHintSchema, casinoSchema, coordinatesSchema, isoDateTimeSchema } from "./casino.js";
import {
  incidentKindSchema,
  payoutSchema,
  shuffleSchema,
  surrenderSchema,
  tableEventKindSchema,
} from "./enums.js";

export const errorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorBody = z.infer<typeof errorBodySchema>;

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
  radius: z.coerce.number().gt(0).lte(50_000).optional(),
});
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;

export const nearbyResponseSchema = z.object({
  casinos: z.array(casinoSchema),
  source: z.enum(["cache", "google", "database"]),
});
export type NearbyResponse = z.infer<typeof nearbyResponseSchema>;

export const autocompleteQuerySchema = z.object({
  q: z.string().trim().min(1).max(256),
});
export type AutocompleteQuery = z.infer<typeof autocompleteQuerySchema>;

export const autocompleteSuggestionSchema = z.object({
  placeId: z.string(),
  displayName: z.string(),
  formattedAddress: z.string().nullable(),
});
export type AutocompleteSuggestion = z.infer<typeof autocompleteSuggestionSchema>;

export const autocompleteResponseSchema = z.object({
  suggestions: z.array(autocompleteSuggestionSchema),
  source: z.enum(["cache", "google"]),
});
export type AutocompleteResponse = z.infer<typeof autocompleteResponseSchema>;

export const casinoResponseSchema = z.object({
  casino: casinoSchema,
});
export type CasinoResponse = z.infer<typeof casinoResponseSchema>;

export const startSessionBodySchema = casinoHintSchema;
export type StartSessionBody = z.infer<typeof startSessionBodySchema>;

export const startSessionResponseSchema = z.object({
  casino: casinoSchema,
  observed: z.literal("session"),
});
export type StartSessionResponse = z.infer<typeof startSessionResponseSchema>;

export const reportIncidentBodySchema = z.object({
  kind: incidentKindSchema,
  occurredAt: isoDateTimeSchema,
  sessionId: z.string().min(1).max(256).optional(),
  notes: z.string().max(2000).optional(),
  externalAuthorId: z.string().min(1).max(256).optional(),
});
export type ReportIncidentBody = z.infer<typeof reportIncidentBodySchema>;

export const publicIncidentSchema = z.object({
  id: z.string().uuid(),
  kind: incidentKindSchema,
  occurredAt: isoDateTimeSchema,
  notes: z.string().nullable(),
});
export type PublicIncident = z.infer<typeof publicIncidentSchema>;

export const reportIncidentResponseSchema = z.object({
  incident: publicIncidentSchema,
});
export type ReportIncidentResponse = z.infer<typeof reportIncidentResponseSchema>;

export const listIncidentsQuerySchema = z.object({
  since: isoDateTimeSchema.optional(),
  kind: incidentKindSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type ListIncidentsQuery = z.infer<typeof listIncidentsQuerySchema>;

export const listIncidentsResponseSchema = z.object({
  incidents: z.array(publicIncidentSchema),
});
export type ListIncidentsResponse = z.infer<typeof listIncidentsResponseSchema>;

export const tableRulesSchema = z.object({
  deckCount: z.number().int().min(1).max(8).optional(),
  payout: payoutSchema.optional(),
  standOnSoft17: z.boolean().optional(),
  doubleAfterSplit: z.boolean().optional(),
  surrender: surrenderSchema.optional(),
});
export type TableRules = z.infer<typeof tableRulesSchema>;

export const reportTableConditionBodySchema = z.object({
  eventKind: tableEventKindSchema,
  reportedAt: isoDateTimeSchema,
  tableLabel: z.string().max(128).optional(),
  tableMinimum: z.number().nonnegative().optional(),
  tableMaximum: z.number().nonnegative().optional(),
  betUnit: z.number().nonnegative().optional(),
  shuffle: shuffleSchema.optional(),
  rules: tableRulesSchema.optional(),
  notes: z.string().max(2000).optional(),
  externalAuthorId: z.string().min(1).max(256).optional(),
});
export type ReportTableConditionBody = z.infer<typeof reportTableConditionBodySchema>;

export const publicTableConditionSchema = z.object({
  id: z.string().uuid(),
  eventKind: tableEventKindSchema,
  reportedAt: isoDateTimeSchema,
  tableLabel: z.string().nullable(),
  tableMinimum: z.number().nullable(),
  tableMaximum: z.number().nullable(),
  betUnit: z.number().nullable(),
  shuffle: shuffleSchema.nullable(),
  rules: tableRulesSchema.nullable(),
  notes: z.string().nullable(),
});
export type PublicTableCondition = z.infer<typeof publicTableConditionSchema>;

export const reportTableConditionResponseSchema = z.object({
  condition: publicTableConditionSchema,
});
export type ReportTableConditionResponse = z.infer<
  typeof reportTableConditionResponseSchema
>;

export const listTableConditionsQuerySchema = z.object({
  current: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type ListTableConditionsQuery = z.infer<typeof listTableConditionsQuerySchema>;

export const listTableConditionsResponseSchema = z.object({
  conditions: z.array(publicTableConditionSchema),
  current: z.boolean(),
});
export type ListTableConditionsResponse = z.infer<
  typeof listTableConditionsResponseSchema
>;

export const publicReviewSchema = z.object({
  id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type PublicReview = z.infer<typeof publicReviewSchema>;

export const listReviewsResponseSchema = z.object({
  reviews: z.array(publicReviewSchema),
});
export type ListReviewsResponse = z.infer<typeof listReviewsResponseSchema>;

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  database: z.literal("up"),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const placeIdParamSchema = z.object({
  placeId: z.string().min(1),
});

export { coordinatesSchema, casinoSchema, casinoHintSchema };
