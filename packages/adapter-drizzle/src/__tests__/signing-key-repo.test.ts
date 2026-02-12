/**
 * Integration tests for DrizzleSigningKeyRepo.
 * Uses transaction-per-test pattern for isolation.
 */

import { afterAll, describe } from "vitest";

import { DrizzleSigningKeyRepo } from "../signing-key-repo.js";
import { closeTestPool, createTestUser, expect, test } from "../tests/fixtures.js";

describe("drizzleSigningKeyRepo", () => {
  afterAll(async () => {
    await closeTestPool();
  });

  describe("create", () => {
    test("generates a key and returns rawKey + prefix", async ({ tx }) => {
      const user = await createTestUser(tx);
      const repo = new DrizzleSigningKeyRepo(tx);

      const result = await repo.create(user.id);

      expect(result.rawKey).toMatch(/^[0-9a-f]{64}$/); // 32 bytes hex
      expect(result.keyPrefix).toMatch(/^sk_[0-9a-f]{8}$/);
      expect(result.keyPrefix).toBe(`sk_${result.rawKey.slice(0, 8)}`);
    });

    test("throws on duplicate key for same user", async ({ tx }) => {
      const user = await createTestUser(tx);
      const repo = new DrizzleSigningKeyRepo(tx);

      await repo.create(user.id);
      await expect(repo.create(user.id)).rejects.toThrow();
    });
  });

  describe("getInfo", () => {
    test("returns hasKey: false when no key exists", async ({ tx }) => {
      const user = await createTestUser(tx);
      const repo = new DrizzleSigningKeyRepo(tx);

      const info = await repo.getInfo(user.id);

      expect(info.hasKey).toBe(false);
      expect(info.keyPrefix).toBeNull();
      expect(info.createdAt).toBeNull();
      expect(info.rotatedAt).toBeNull();
    });

    test("returns key metadata after creation", async ({ tx }) => {
      const user = await createTestUser(tx);
      const repo = new DrizzleSigningKeyRepo(tx);

      const { keyPrefix } = await repo.create(user.id);
      const info = await repo.getInfo(user.id);

      expect(info.hasKey).toBe(true);
      expect(info.keyPrefix).toBe(keyPrefix);
      expect(info.createdAt).toBeInstanceOf(Date);
      expect(info.rotatedAt).toBeNull();
    });
  });

  describe("rotate", () => {
    test("replaces old key with new one", async ({ tx }) => {
      const user = await createTestUser(tx);
      const repo = new DrizzleSigningKeyRepo(tx);

      const original = await repo.create(user.id);
      const rotated = await repo.rotate(user.id);

      expect(rotated.rawKey).not.toBe(original.rawKey);
      expect(rotated.keyPrefix).not.toBe(original.keyPrefix);
      expect(rotated.rawKey).toMatch(/^[0-9a-f]{64}$/);
    });

    test("sets rotatedAt timestamp", async ({ tx }) => {
      const user = await createTestUser(tx);
      const repo = new DrizzleSigningKeyRepo(tx);

      await repo.create(user.id);
      await repo.rotate(user.id);

      const info = await repo.getInfo(user.id);
      expect(info.rotatedAt).toBeInstanceOf(Date);
    });

    test("throws when no key exists", async ({ tx }) => {
      const user = await createTestUser(tx);
      const repo = new DrizzleSigningKeyRepo(tx);

      await expect(repo.rotate(user.id)).rejects.toThrow("No signing key exists");
    });
  });

  describe("delete", () => {
    test("removes key completely", async ({ tx }) => {
      const user = await createTestUser(tx);
      const repo = new DrizzleSigningKeyRepo(tx);

      await repo.create(user.id);
      await repo.delete(user.id);

      const info = await repo.getInfo(user.id);
      expect(info.hasKey).toBe(false);
    });

    test("is idempotent — no error when key does not exist", async ({ tx }) => {
      const user = await createTestUser(tx);
      const repo = new DrizzleSigningKeyRepo(tx);

      await expect(repo.delete(user.id)).resolves.not.toThrow();
    });
  });
});
