/**
 * Sliding-window rate limiter with in-memory Map-based storage
 *
 * Implements a sliding window algorithm that provides smoother rate limiting
 * compared to fixed windows by interpolating between the current and previous
 * window counts.
 *
 * NOTE: This in-memory implementation is suitable for single-instance deployments.
 * For multi-instance deployments (horizontal scaling), migrate to Redis-based storage.
 * See docs/_RUNNING_TECH_DEBT.md for migration notes.
 */

import type { Context, Next } from "hono";

import { logger } from "./logger.js";

/**
 * Stores request counts for sliding window calculation
 */
type WindowData = {
  /** Requests in current window */
  currentCount: number;
  /** Requests in previous window */
  previousCount: number;
  /** Timestamp when current window started */
  windowStart: number;
};

/**
 * Result from checking rate limit
 */
export type RateLimitResult = {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count in the sliding window */
  current: number;
  /** Maximum allowed requests */
  limit: number;
  /** Seconds until the rate limit resets */
  resetInSeconds: number;
};

/**
 * Configuration options for the rate limiter
 */
export type RateLimiterOptions = {
  /** Maximum requests allowed per window */
  limit: number;
  /** Window size in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number;
  /** Custom clock function for testing (default: Date.now) */
  now?: () => number;
};

/**
 * Sliding-window rate limiter
 *
 * Uses a sliding window algorithm that interpolates between current and
 * previous window counts to provide smoother rate limiting compared to
 * fixed windows.
 *
 * Algorithm:
 * 1. Divide time into fixed windows (e.g., 1 minute each)
 * 2. Track request counts for current and previous windows
 * 3. Calculate weighted sum based on position in current window:
 *    effectiveCount = previousCount * (1 - positionInWindow) + currentCount
 *
 * Example: At 30 seconds into current window:
 * - Previous window had 50 requests
 * - Current window has 20 requests
 * - Effective count = 50 * 0.5 + 20 = 45 requests
 */
export class RateLimiter {
  private readonly store: Map<string, WindowData>;
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(options: RateLimiterOptions) {
    this.store = new Map();
    this.limit = options.limit;
    this.windowMs = options.windowMs ?? 60_000; // Default: 1 minute
    this.now = options.now ?? Date.now;
  }

  /**
   * Check if a request should be allowed and record it
   *
   * @param key - Unique identifier (typically userId)
   * @returns RateLimitResult with allowed status and metadata
   */
  check(key: string): RateLimitResult {
    const currentTime = this.now();
    const currentWindow = Math.floor(currentTime / this.windowMs);

    let data = this.store.get(key);

    if (!data) {
      // First request from this key
      data = {
        currentCount: 0,
        previousCount: 0,
        windowStart: currentWindow,
      };
      this.store.set(key, data);
    }
    else if (data.windowStart !== currentWindow) {
      // Window has changed - slide forward
      if (data.windowStart === currentWindow - 1) {
        // Previous window just ended, keep its count
        data.previousCount = data.currentCount;
      }
      else {
        // More than one window has passed, previous is now 0
        data.previousCount = 0;
      }
      data.currentCount = 0;
      data.windowStart = currentWindow;
    }

    // Calculate position in current window (0 to 1)
    const windowStartTime = currentWindow * this.windowMs;
    const positionInWindow = (currentTime - windowStartTime) / this.windowMs;

    // Calculate effective count using sliding window interpolation
    const effectiveCount = Math.floor(
      data.previousCount * (1 - positionInWindow) + data.currentCount,
    );

    // Calculate seconds until window resets
    const resetInSeconds = Math.ceil(
      (this.windowMs - (currentTime - windowStartTime)) / 1000,
    );

    // Check if under limit BEFORE incrementing
    if (effectiveCount >= this.limit) {
      logger.debug(
        { key, effectiveCount, limit: this.limit },
        "Rate limit exceeded",
      );
      return {
        allowed: false,
        current: effectiveCount,
        limit: this.limit,
        resetInSeconds,
      };
    }

    // Increment count for this window
    data.currentCount++;

    return {
      allowed: true,
      current: effectiveCount + 1, // Include this request in reported count
      limit: this.limit,
      resetInSeconds,
    };
  }

  /**
   * Get current rate limit status without incrementing counter
   *
   * @param key - Unique identifier (typically userId)
   * @returns RateLimitResult with current status
   */
  peek(key: string): RateLimitResult {
    const currentTime = this.now();
    const currentWindow = Math.floor(currentTime / this.windowMs);

    const data = this.store.get(key);

    if (!data || data.windowStart < currentWindow - 1) {
      // No data or data is stale
      return {
        allowed: true,
        current: 0,
        limit: this.limit,
        resetInSeconds: Math.ceil(this.windowMs / 1000),
      };
    }

    let previousCount = data.previousCount;
    let currentCount = data.currentCount;

    if (data.windowStart !== currentWindow) {
      // Window has changed, adjust counts
      if (data.windowStart === currentWindow - 1) {
        previousCount = currentCount;
        currentCount = 0;
      }
      else {
        previousCount = 0;
        currentCount = 0;
      }
    }

    const windowStartTime = currentWindow * this.windowMs;
    const positionInWindow = (currentTime - windowStartTime) / this.windowMs;

    const effectiveCount = Math.floor(
      previousCount * (1 - positionInWindow) + currentCount,
    );

    const resetInSeconds = Math.ceil(
      (this.windowMs - (currentTime - windowStartTime)) / 1000,
    );

    return {
      allowed: effectiveCount < this.limit,
      current: effectiveCount,
      limit: this.limit,
      resetInSeconds,
    };
  }

  /**
   * Reset rate limit data for a specific key
   *
   * @param key - Unique identifier to reset
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all rate limit data
   * Useful for testing or graceful shutdown
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get the number of tracked keys
   * Useful for monitoring memory usage
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Clean up stale entries to prevent memory leaks
   * Should be called periodically (e.g., every few minutes)
   *
   * Removes entries that haven't been accessed in over 2 windows
   */
  cleanup(): number {
    const currentTime = this.now();
    const currentWindow = Math.floor(currentTime / this.windowMs);
    const staleThreshold = currentWindow - 2;

    let cleaned = 0;
    for (const [key, data] of this.store) {
      if (data.windowStart < staleThreshold) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug({ cleaned, remaining: this.store.size }, "Rate limiter cleanup completed");
    }

    return cleaned;
  }
}

/**
 * Create a rate limiter instance with the given configuration
 *
 * @param limit - Maximum requests per minute
 * @param options - Additional configuration options
 * @returns RateLimiter instance
 */
export function createRateLimiter(
  limit: number,
  options?: Omit<RateLimiterOptions, "limit">,
): RateLimiter {
  return new RateLimiter({ limit, ...options });
}

// ============================================================================
// Hono Middleware Factory
// ============================================================================

/**
 * Configuration for rate limit middleware
 */
export type RateLimitMiddlewareOptions = {
  /** Rate limiter for mutation requests (POST, PATCH, DELETE, PUT) */
  mutationLimiter: RateLimiter;
  /** Rate limiter for read requests (GET, HEAD, OPTIONS) */
  readLimiter: RateLimiter;
  /**
   * Function to extract the rate limit key from context
   * Defaults to using userId from context (set by requireAuth middleware)
   */
  keyExtractor?: (c: Context) => string | null;
};

/** HTTP methods considered as mutations */
const MUTATION_METHODS = new Set(["POST", "PATCH", "DELETE", "PUT"]);

/**
 * Creates a Hono middleware factory for rate limiting
 *
 * This middleware should be applied AFTER auth middleware since it relies on
 * userId being set in the context. It differentiates between mutation requests
 * (POST, PATCH, DELETE, PUT) and read requests (GET, HEAD, OPTIONS), applying
 * different rate limits to each.
 *
 * @example
 * ```ts
 * const { mutationLimiter, readLimiter, rateLimitMiddleware } = createRateLimitMiddleware({
 *   mutationLimit: config.RATE_LIMIT_MUTATION_RPM,
 *   readLimit: config.RATE_LIMIT_READ_RPM,
 * });
 *
 * // Apply after auth middleware
 * app.use("/jobs/*", requireAuth(auth, config));
 * app.use("/jobs/*", rateLimitMiddleware);
 * ```
 *
 * On rate limit exceeded, returns:
 * - Status: 429 Too Many Requests
 * - Headers: Retry-After (seconds until reset), X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 * - Body: { error: "Too many requests", retryAfter: <seconds> }
 */
export function createRateLimitMiddleware(options: {
  mutationLimit: number;
  readLimit: number;
  /** Custom clock for testing */
  now?: () => number;
}) {
  const mutationLimiter = createRateLimiter(options.mutationLimit, { now: options.now });
  const readLimiter = createRateLimiter(options.readLimit, { now: options.now });

  /**
   * Rate limit middleware for Hono
   *
   * IMPORTANT: Must be applied AFTER auth middleware.
   * Requires userId to be set in context.
   */
  const rateLimitMiddleware = async (c: Context, next: Next) => {
    // Extract userId from context (set by requireAuth middleware)
    // eslint-disable-next-line ts/consistent-type-assertions -- userId may not be set if auth middleware hasn't run
    const userId = c.get("userId") as string | undefined;

    if (!userId) {
      // No userId means auth middleware hasn't run or user isn't authenticated
      // Skip rate limiting - let auth middleware handle the 401
      logger.debug(
        { path: c.req.path, method: c.req.method },
        "Rate limit skipped: no userId in context",
      );
      return next();
    }

    // Determine which limiter to use based on HTTP method
    const method = c.req.method.toUpperCase();
    const isMutation = MUTATION_METHODS.has(method);
    const limiter = isMutation ? mutationLimiter : readLimiter;

    // Check rate limit
    const result = limiter.check(userId);

    // Always set rate limit headers for observability
    c.header("X-RateLimit-Limit", result.limit.toString());
    c.header("X-RateLimit-Remaining", Math.max(0, result.limit - result.current).toString());
    c.header("X-RateLimit-Reset", result.resetInSeconds.toString());

    if (!result.allowed) {
      // Rate limit exceeded - return 429
      logger.info(
        {
          userId,
          path: c.req.path,
          method,
          current: result.current,
          limit: result.limit,
          resetInSeconds: result.resetInSeconds,
          limiterType: isMutation ? "mutation" : "read",
        },
        "Rate limit exceeded",
      );

      c.header("Retry-After", result.resetInSeconds.toString());

      return c.json(
        {
          error: "Too many requests",
          retryAfter: result.resetInSeconds,
        },
        429,
      );
    }

    return next();
  };

  return {
    mutationLimiter,
    readLimiter,
    rateLimitMiddleware,
  };
}

/**
 * Start periodic cleanup of stale rate limit entries
 *
 * Call this once when the API starts to prevent memory leaks from
 * accumulated rate limit data for users who are no longer active.
 *
 * @param limiters - Array of rate limiters to clean up
 * @param intervalMs - Cleanup interval in milliseconds (default: 5 minutes)
 * @returns Cleanup function to stop the interval
 */
export function startRateLimitCleanup(
  limiters: RateLimiter[],
  intervalMs = 5 * 60 * 1000,
): () => void {
  const interval = setInterval(() => {
    for (const limiter of limiters) {
      limiter.cleanup();
    }
  }, intervalMs);

  // Prevent the interval from keeping the process alive
  interval.unref();

  return () => clearInterval(interval);
}
