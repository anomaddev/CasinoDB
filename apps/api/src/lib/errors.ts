import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorCode } from "@casinodb/shared";

export class ApiError extends HTTPException {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(
    status: ContentfulStatusCode,
    code: ErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(status, { message });
    this.code = code;
    this.details = details;
  }
}

export function unauthorized(message = "Missing or invalid API key"): ApiError {
  return new ApiError(401, "unauthorized", message);
}

export function forbidden(message = "Insufficient API key scope"): ApiError {
  return new ApiError(403, "forbidden", message);
}

export function notFound(message = "Casino not found"): ApiError {
  return new ApiError(404, "not_found", message);
}

export function validationError(message: string, details?: unknown): ApiError {
  return new ApiError(400, "validation_error", message, details);
}

export function placesUnavailable(
  message = "Google Places is unavailable and no cached data exists",
): ApiError {
  return new ApiError(502, "places_unavailable", message);
}
