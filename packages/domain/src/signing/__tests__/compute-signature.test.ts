import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { computeSignature } from "../compute-signature.js";

describe("computeSignature", () => {
  const testKey = "a".repeat(64); // 64-char hex key

  it("produces valid HMAC-SHA256 hex output", () => {
    const result = computeSignature(testKey, 1700000000, "{\"foo\":\"bar\"}");
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches manual HMAC computation", () => {
    const timestamp = 1700000000;
    const body = "{\"foo\":\"bar\"}";
    const payload = `${timestamp}.${body}`;
    const expected = createHmac("sha256", testKey).update(payload).digest("hex");

    const result = computeSignature(testKey, timestamp, body);
    expect(result).toBe(expected);
  });

  it("uses empty string for bodyless requests", () => {
    const timestamp = 1700000000;
    const payload = `${timestamp}.`;
    const expected = createHmac("sha256", testKey).update(payload).digest("hex");

    const result = computeSignature(testKey, timestamp, "");
    expect(result).toBe(expected);
  });

  it("produces different signatures for different keys", () => {
    const key1 = "a".repeat(64);
    const key2 = "b".repeat(64);

    const sig1 = computeSignature(key1, 1700000000, "body");
    const sig2 = computeSignature(key2, 1700000000, "body");

    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different timestamps", () => {
    const sig1 = computeSignature(testKey, 1700000000, "body");
    const sig2 = computeSignature(testKey, 1700000001, "body");

    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different bodies", () => {
    const sig1 = computeSignature(testKey, 1700000000, "{\"a\":1}");
    const sig2 = computeSignature(testKey, 1700000000, "{\"a\":2}");

    expect(sig1).not.toBe(sig2);
  });

  it("is deterministic — same inputs produce same output", () => {
    const sig1 = computeSignature(testKey, 1700000000, "hello");
    const sig2 = computeSignature(testKey, 1700000000, "hello");

    expect(sig1).toBe(sig2);
  });
});
