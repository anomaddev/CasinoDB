import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { env } from "./env.js";
import { ApiError } from "./lib/errors.js";
import { healthRoutes } from "./routes/health.js";
import { casinoRoutes } from "./routes/casinos.js";
import { sql } from "./db/index.js";

const app = new Hono();

app.use("*", cors());

app.route("/", healthRoutes);
app.route("/v1/casinos", casinoRoutes);

app.notFound((c) =>
  c.json({ error: { code: "not_found", message: "Route not found" } }, 404),
);

app.onError((error, c) => {
  if (error instanceof ApiError) {
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      },
      error.status,
    );
  }
  if (error instanceof ZodError) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "Request validation failed",
          details: error.flatten(),
        },
      },
      400,
    );
  }
  if (error instanceof HTTPException) {
    const status = error.status;
    if (status === 400) {
      return c.json(
        { error: { code: "validation_error", message: error.message } },
        400,
      );
    }
    return c.json(
      { error: { code: "internal", message: error.message } },
      status,
    );
  }
  console.error(error);
  return c.json({ error: { code: "internal", message: "Internal server error" } }, 500);
});

const server = serve({ fetch: app.fetch, port: env.PORT, hostname: env.HOST }, (info) => {
  console.log(`CasinoDB API listening on http://${info.address}:${info.port}`);
});

async function shutdown() {
  server.close();
  await sql.end({ timeout: 5 });
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
