/**
 * Application error hierarchy.
 *
 * Services throw these typed errors; the server-action layer catches them and
 * maps them to a safe, serializable ActionResult. Unknown errors are never
 * leaked to the client — only `AppError` messages are considered user-safe.
 */

export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "APP_ERROR", status = 400) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super(
      id ? `${entity} not found (id: ${id})` : `${entity} not found`,
      "NOT_FOUND",
      404,
    );
  }
}

export class ValidationError extends AppError {
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message, "VALIDATION_ERROR", 422);
    this.fieldErrors = fieldErrors;
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You are not authorized to perform this action") {
    super(message, "FORBIDDEN", 403);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "You must be signed in") {
    super(message, "UNAUTHENTICATED", 401);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT", 409);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, "BUSINESS_RULE_VIOLATION", 422);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please try again shortly.") {
    super(message, "RATE_LIMITED", 429);
  }
}
