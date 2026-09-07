import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  DEFAULT_CURRENT_TABLE_WINDOW_HOURS,
  DEFAULT_INCIDENT_SUMMARY_DAYS,
  DEFAULT_PLACES_AUTOCOMPLETE_TTL_SECONDS,
  DEFAULT_PLACES_DETAILS_TTL_SECONDS,
  DEFAULT_PLACES_NEARBY_TTL_SECONDS,
} from "@casinodb/shared";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
config({ path: resolve(root, ".env") });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_KEY_PEPPER: z.string().min(8),
  GOOGLE_PLACES_API_KEY: z.string().optional().default(""),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  CURRENT_TABLE_WINDOW_HOURS: z.coerce
    .number()
    .positive()
    .default(DEFAULT_CURRENT_TABLE_WINDOW_HOURS),
  INCIDENT_SUMMARY_DAYS: z.coerce.number().positive().default(DEFAULT_INCIDENT_SUMMARY_DAYS),
  PLACES_DETAILS_TTL_SECONDS: z.coerce
    .number()
    .positive()
    .default(DEFAULT_PLACES_DETAILS_TTL_SECONDS),
  PLACES_NEARBY_TTL_SECONDS: z.coerce
    .number()
    .positive()
    .default(DEFAULT_PLACES_NEARBY_TTL_SECONDS),
  PLACES_AUTOCOMPLETE_TTL_SECONDS: z.coerce
    .number()
    .positive()
    .default(DEFAULT_PLACES_AUTOCOMPLETE_TTL_SECONDS),
});

export const env = envSchema.parse(process.env);
export const repoRoot = root;
