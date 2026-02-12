/**
 * Integration tests for DrizzleSigningKeyProvider.
 * Uses transaction-per-test pattern for isolation.
 */

import { afterAll, describe } from "vitest";

import { DrizzleSigningKeyProvider } from "../signing-key-provider.js";
import { DrizzleSigningKeyRepo } from "../signing-key-repo.js";
import { closeTestPool, createTestUser, expect, test } from "../tests/fixtures.js";

describe("drizzleSigningKeyProvider", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  test("returns null when no key exists for tenant", async ({ tx }) => {
    const user = await createTestUser(tx);
    const provider = new DrizzleSigningKeyProvider(tx);

    const key = await provider.getKey(user.id);

    expect(key).toBeNull();
  });

  test("returns raw key when key exists for tenant", async ({ tx }) => {
    const user = await createTestUser(tx);
    const repo = new DrizzleSigningKeyRepo(tx);
    const provider = new DrizzleSigningKeyProvider(tx);

    const { rawKey } = await repo.create(user.id);
    const key = await provider.getKey(user.id);

    expect(key).toBe(rawKey);
  });

  test("returns null for unknown tenant", async ({ tx }) => {
    const provider = new DrizzleSigningKeyProvider(tx);

    const key = await provider.getKey("nonexistent-user-id");

    expect(key).toBeNull();
  });
});
