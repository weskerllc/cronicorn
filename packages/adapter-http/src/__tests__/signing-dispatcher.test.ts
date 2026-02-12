import type { Clock, Dispatcher, ExecutionResult, JobEndpoint, Logger, SigningKeyProvider } from "@cronicorn/domain";

import { computeSignature } from "@cronicorn/domain/signing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SigningDispatcher } from "../signing-dispatcher.js";

// Minimal test doubles
function createFakeDispatcher(plan?: (ep: JobEndpoint) => ExecutionResult): Dispatcher & { lastEndpoint: JobEndpoint | null } {
  let lastEndpoint: JobEndpoint | null = null;
  return {
    get lastEndpoint() { return lastEndpoint; },
    async execute(ep: JobEndpoint): Promise<ExecutionResult> {
      lastEndpoint = ep;
      return plan ? plan(ep) : { status: "success", durationMs: 100 };
    },
  };
}

function createFakeKeyProvider(keys: Record<string, string>): SigningKeyProvider {
  return {
    async getKey(tenantId: string): Promise<string | null> {
      return keys[tenantId] ?? null;
    },
  };
}

function createFakeClock(now: Date): Clock {
  return {
    now: () => now,
    sleep: () => Promise.resolve(),
  };
}

function createFakeLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => createFakeLogger(),
  };
}

function createEndpoint(overrides?: Partial<JobEndpoint>): JobEndpoint {
  return {
    id: "ep-1",
    tenantId: "user-1",
    name: "test endpoint",
    nextRunAt: new Date(),
    failureCount: 0,
    ...overrides,
  };
}

describe("signingDispatcher", () => {
  const testKey = "a".repeat(64);
  const fixedTime = new Date("2024-01-01T00:00:00Z");
  const expectedTimestamp = Math.floor(fixedTime.getTime() / 1000);

  let inner: ReturnType<typeof createFakeDispatcher>;
  let logger: ReturnType<typeof createFakeLogger>;

  beforeEach(() => {
    inner = createFakeDispatcher();
    logger = createFakeLogger();
  });

  it("adds signature headers when key exists", async () => {
    const keyProvider = createFakeKeyProvider({ "user-1": testKey });
    const clock = createFakeClock(fixedTime);
    const dispatcher = new SigningDispatcher(inner, keyProvider, logger, clock);

    const ep = createEndpoint({ bodyJson: { foo: "bar" } });
    await dispatcher.execute(ep);

    const signedEp = inner.lastEndpoint!;
    expect(signedEp.headersJson).toHaveProperty("X-Cronicorn-Signature");
    expect(signedEp.headersJson).toHaveProperty("X-Cronicorn-Timestamp");
    expect(signedEp.headersJson!["X-Cronicorn-Timestamp"]).toBe(String(expectedTimestamp));

    // Verify signature is correct
    const body = JSON.stringify({ foo: "bar" });
    const expectedSig = computeSignature(testKey, expectedTimestamp, body);
    expect(signedEp.headersJson!["X-Cronicorn-Signature"]).toBe(`sha256=${expectedSig}`);
  });

  it("uses empty string for body when bodyJson is null", async () => {
    const keyProvider = createFakeKeyProvider({ "user-1": testKey });
    const clock = createFakeClock(fixedTime);
    const dispatcher = new SigningDispatcher(inner, keyProvider, logger, clock);

    const ep = createEndpoint({ bodyJson: undefined });
    await dispatcher.execute(ep);

    const signedEp = inner.lastEndpoint!;
    const expectedSig = computeSignature(testKey, expectedTimestamp, "");
    expect(signedEp.headersJson!["X-Cronicorn-Signature"]).toBe(`sha256=${expectedSig}`);
  });

  it("passes through unsigned when no key exists", async () => {
    const keyProvider = createFakeKeyProvider({}); // No keys
    const clock = createFakeClock(fixedTime);
    const dispatcher = new SigningDispatcher(inner, keyProvider, logger, clock);

    const ep = createEndpoint();
    await dispatcher.execute(ep);

    const passedEp = inner.lastEndpoint!;
    expect(passedEp.headersJson).toBeUndefined();
  });

  it("fails open: proceeds unsigned on key lookup error", async () => {
    const errorProvider: SigningKeyProvider = {
      async getKey() {
        throw new Error("DB connection lost");
      },
    };
    const clock = createFakeClock(fixedTime);
    const dispatcher = new SigningDispatcher(inner, errorProvider, logger, clock);

    const ep = createEndpoint();
    const result = await dispatcher.execute(ep);

    expect(result.status).toBe("success");
    expect(logger.warn).toHaveBeenCalledOnce();
    // Should proceed with original endpoint (no signing headers)
    const passedEp = inner.lastEndpoint!;
    expect(passedEp.headersJson).toBeUndefined();
  });

  it("preserves existing headers when signing", async () => {
    const keyProvider = createFakeKeyProvider({ "user-1": testKey });
    const clock = createFakeClock(fixedTime);
    const dispatcher = new SigningDispatcher(inner, keyProvider, logger, clock);

    const ep = createEndpoint({
      headersJson: { "Authorization": "Bearer abc", "X-Custom": "value" },
    });
    await dispatcher.execute(ep);

    const signedEp = inner.lastEndpoint!;
    expect(signedEp.headersJson!.Authorization).toBe("Bearer abc");
    expect(signedEp.headersJson!["X-Custom"]).toBe("value");
    expect(signedEp.headersJson!["X-Cronicorn-Signature"]).toBeDefined();
  });

  it("delegates to inner dispatcher and returns its result", async () => {
    const keyProvider = createFakeKeyProvider({ "user-1": testKey });
    const clock = createFakeClock(fixedTime);
    const customResult: ExecutionResult = {
      status: "failed",
      durationMs: 500,
      errorMessage: "timeout",
    };
    const customInner = createFakeDispatcher(() => customResult);
    const dispatcher = new SigningDispatcher(customInner, keyProvider, logger, clock);

    const result = await dispatcher.execute(createEndpoint());
    expect(result).toEqual(customResult);
  });
});
