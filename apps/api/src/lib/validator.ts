import { zValidator as zv } from "@hono/zod-validator";
import type { ZodType } from "zod";

export function zValidator<T extends ZodType>(
  target: "query" | "json" | "param",
  schema: T,
) {
  return zv(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: "validation_error",
            message: "Request validation failed",
            details: result.error.flatten(),
          },
        },
        400,
      );
    }
  });
}
