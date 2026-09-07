import { Hono } from "hono";
import { zValidator } from "../lib/validator.js";
import {
  autocompleteQuerySchema,
  listIncidentsQuerySchema,
  listTableConditionsQuerySchema,
  nearbyQuerySchema,
  reportIncidentBodySchema,
  reportTableConditionBodySchema,
  startSessionBodySchema,
} from "@casinodb/shared";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import { autocomplete, getCasino, searchNearby, startSession } from "../lib/casinos.js";
import { listIncidents, reportIncident } from "../lib/incidents.js";
import { listTableConditions, reportTableCondition } from "../lib/conditions.js";
import { listReviews } from "../lib/reviews.js";
import { validationError } from "../lib/errors.js";

function requirePlaceId(c: { req: { param: (key: string) => string | undefined } }): string {
  const placeId = c.req.param("placeId");
  if (!placeId) throw validationError("placeId is required");
  return placeId;
}

export const casinoRoutes = new Hono<AppEnv>();

casinoRoutes.get(
  "/nearby",
  requireAuth("read"),
  zValidator("query", nearbyQuerySchema),
  async (c) => {
    const { lat, lng, radius } = c.req.valid("query");
    const result = await searchNearby(lat, lng, radius, c.get("client").sourceApp);
    return c.json(result);
  },
);

casinoRoutes.get(
  "/autocomplete",
  requireAuth("read"),
  zValidator("query", autocompleteQuerySchema),
  async (c) => {
    const { q } = c.req.valid("query");
    const result = await autocomplete(q);
    return c.json(result);
  },
);

casinoRoutes.get("/:placeId", requireAuth("read"), async (c) => {
  const casino = await getCasino(requirePlaceId(c), c.get("client").sourceApp);
  return c.json({ casino });
});

casinoRoutes.post(
  "/:placeId/sessions",
  requireAuth("write:observations"),
  async (c) => {
    const text = await c.req.text();
    const body = startSessionBodySchema.parse(text ? JSON.parse(text) : {});
    const casino = await startSession(requirePlaceId(c), c.get("client").sourceApp, body);
    return c.json({ casino, observed: "session" as const }, 201);
  },
);

casinoRoutes.post(
  "/:placeId/incidents",
  requireAuth("write:incidents"),
  zValidator("json", reportIncidentBodySchema),
  async (c) => {
    const incident = await reportIncident(
      requirePlaceId(c),
      c.get("client").sourceApp,
      c.req.valid("json"),
    );
    return c.json({ incident }, 201);
  },
);

casinoRoutes.get(
  "/:placeId/incidents",
  requireAuth("read"),
  zValidator("query", listIncidentsQuerySchema),
  async (c) => {
    const incidents = await listIncidents(requirePlaceId(c), c.req.valid("query"));
    return c.json({ incidents });
  },
);

casinoRoutes.post(
  "/:placeId/conditions",
  requireAuth("write:conditions"),
  zValidator("json", reportTableConditionBodySchema),
  async (c) => {
    const condition = await reportTableCondition(
      requirePlaceId(c),
      c.get("client").sourceApp,
      c.req.valid("json"),
    );
    return c.json({ condition }, 201);
  },
);

casinoRoutes.get(
  "/:placeId/conditions",
  requireAuth("read"),
  zValidator("query", listTableConditionsQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const current = query.current ?? true;
    const conditions = await listTableConditions(requirePlaceId(c), {
      current,
      limit: query.limit,
    });
    return c.json({ conditions, current });
  },
);

casinoRoutes.get("/:placeId/reviews", requireAuth("read"), async (c) => {
  const reviews = await listReviews(requirePlaceId(c));
  return c.json({ reviews });
});
