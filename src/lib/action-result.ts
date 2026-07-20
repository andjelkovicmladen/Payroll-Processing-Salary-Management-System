import { ZodError } from "zod";
import { AppError, ValidationError } from "./errors";
import { logger } from "./logger";

/**
 * Uniform, serializable result envelope for Server Actions.
 * A discriminated union keeps client handling exhaustive and type-safe.
 */
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      code: string;
      fieldErrors?: Record<string, string[]>;
    };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail(
  error: string,
  code = "APP_ERROR",
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { success: false, error, code, fieldErrors };
}

/**
 * Wraps a server-action body with uniform error mapping:
 *  - ZodError        → 422 with per-field messages
 *  - AppError family → its safe message/code
 *  - anything else   → logged server-side, generic message to the client
 */
export async function handleAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors = err.flatten().fieldErrors as Record<
        string,
        string[]
      >;
      return fail("Please correct the highlighted fields", "VALIDATION_ERROR", fieldErrors);
    }
    if (err instanceof ValidationError) {
      return fail(err.message, err.code, err.fieldErrors);
    }
    if (err instanceof AppError) {
      return fail(err.message, err.code);
    }
    // Unknown error: log full details server-side, return a generic message.
    logger.error("Unhandled server action error", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return fail("Something went wrong. Please try again.", "INTERNAL_ERROR");
  }
}
