/**
 * Minimal structured logger.
 *
 * Emits JSON lines in production (friendly to log aggregators like Datadog /
 * CloudWatch) and pretty output in development. Kept dependency-free on
 * purpose; swap the transport here to integrate a real logging backend.
 */
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (process.env.NODE_ENV === "production") {
    // Structured single-line JSON for machine ingestion.
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](JSON.stringify(entry));
    return;
  }

  const prefix = `[${entry.timestamp}] ${level.toUpperCase()}`;
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](
    `${prefix} ${message}`,
    context ?? "",
  );
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => write("debug", msg, ctx),
  info: (msg: string, ctx?: LogContext) => write("info", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => write("warn", msg, ctx),
  error: (msg: string, ctx?: LogContext) => write("error", msg, ctx),
};
