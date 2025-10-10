import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeEach, describe } from "vitest";

import { DrizzleJobsRepo, DrizzleRunsRepo } from "../../src/index.js";
import { testJobsRepoContract, testRunsRepoContract } from "./repos.contract.js";

/**
 * Run contract tests against DrizzleJobsRepo with real PostgreSQL.
 *
 * Uses transaction-per-test pattern for isolation.
 * Requires DATABASE_URL environment variable (loaded from .env.test by vitest).
 *
 * Setup:
 * 1. Copy .env.test.example to .env.test
 * 2. Set DATABASE_URL in .env.test
 * 3. Run: pnpm test
 */

// eslint-disable-next-line node/no-process-env
const DATABASE_URL = process.env.DATABASE_URL;

describe.skipIf(!DATABASE_URL)("drizzleJobsRepo (PostgreSQL)", () => {
  const client = postgres(DATABASE_URL!);
  const db = drizzle(client);

  afterAll(async () => {
    await client.end();
  });

  testJobsRepoContract(() => {
    let currentTime = new Date("2025-01-01T00:00:00Z");
    // eslint-disable-next-line ts/no-explicit-any
    let tx: any;

    beforeEach(async () => {
      currentTime = new Date("2025-01-01T00:00:00Z");
      // Create a transaction for test isolation
      // Note: This is a simplified approach for testing
      // In production, transaction management happens at the composition root
      tx = await db.transaction(async transaction => transaction);
    });

    const now = () => currentTime;
    const setNow = (d: Date) => {
      currentTime = d;
    };
    const repo = new DrizzleJobsRepo(tx, now);
    return { repo, now, setNow };
  });
});

describe.skipIf(!DATABASE_URL)("drizzleRunsRepo (PostgreSQL)", () => {
  const client = postgres(DATABASE_URL!);
  const db = drizzle(client);

  afterAll(async () => {
    await client.end();
  });

  testRunsRepoContract(() => {
    // eslint-disable-next-line ts/no-explicit-any
    let tx: any;

    beforeEach(async () => {
      // Create a transaction for test isolation
      tx = await db.transaction(async transaction => transaction);
    });

    const repo = new DrizzleRunsRepo(tx);
    return { repo };
  });
});
