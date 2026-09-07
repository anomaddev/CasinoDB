import { Hono } from "hono";
import { sql } from "../db/index.js";

export const healthRoutes = new Hono();

healthRoutes.get("/health", async (c) => {
  await sql`SELECT 1`;
  return c.json({ ok: true as const, database: "up" as const });
});
