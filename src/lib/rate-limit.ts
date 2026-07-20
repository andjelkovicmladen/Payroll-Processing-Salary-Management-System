import { RateLimitError } from "./errors";

/**
 * In-memory sliding-window rate limiter.
 *
 * Suitable for a single-instance deployment (and honest about it): for a
 * horizontally-scaled production system this would be swapped for a Redis or
 * Upstash-backed limiter behind the same interface.
 */
interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export interface RateLimitOptions {
  /** Maximum requests allowed within the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

/**
 * Throws `RateLimitError` when `key` exceeds `limit` within the window.
 * Key by user id (or IP for unauthenticated endpoints) + action name.
 */
export function assertRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): void {
  const now = Date.now();
  const win = windows.get(key);

  if (!win || win.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  win.count += 1;
  if (win.count > limit) {
    throw new RateLimitError();
  }
}

/** Periodically drop expired windows so the map cannot grow unbounded. */
const SWEEP_INTERVAL_MS = 60_000;
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, win] of windows) {
      if (win.resetAt <= now) windows.delete(key);
    }
  }, SWEEP_INTERVAL_MS);
  // Don't keep the process alive just for the sweeper.
  if (typeof timer === "object" && "unref" in timer) timer.unref();
}
