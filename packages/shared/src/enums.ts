import { z } from "zod";

export const incidentKindSchema = z.enum(["backed_off", "trespassed"]);
export type IncidentKind = z.infer<typeof incidentKindSchema>;

export const tableEventKindSchema = z.enum(["seated", "updated", "departed"]);
export type TableEventKind = z.infer<typeof tableEventKindSchema>;

export const shuffleSchema = z.enum(["hand", "auto", "constant"]);
export type Shuffle = z.infer<typeof shuffleSchema>;

export const payoutSchema = z.enum(["Standard", "SixToFive"]);
export type Payout = z.infer<typeof payoutSchema>;

export const surrenderSchema = z.enum(["Off", "LateSurrender", "EarlySurrender"]);
export type Surrender = z.infer<typeof surrenderSchema>;

export const observationEventSchema = z.enum(["search", "session"]);
export type ObservationEvent = z.infer<typeof observationEventSchema>;

export const placeCacheEndpointSchema = z.enum(["nearby", "details", "autocomplete"]);
export type PlaceCacheEndpoint = z.infer<typeof placeCacheEndpointSchema>;

export const apiScopeSchema = z.enum([
  "read",
  "write:observations",
  "write:incidents",
  "write:conditions",
]);
export type ApiScope = z.infer<typeof apiScopeSchema>;

export const ALL_API_SCOPES = apiScopeSchema.options;

export const errorCodeSchema = z.enum([
  "unauthorized",
  "forbidden",
  "validation_error",
  "not_found",
  "places_unavailable",
  "internal",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;
