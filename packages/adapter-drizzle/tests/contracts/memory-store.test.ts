import { describe } from "vitest";

import { InMemoryJobsRepo, InMemoryRunsRepo } from "../../../scheduler/src/adapters/memory-store.js";
import { testJobsRepoContract, testRunsRepoContract } from "./repos.contract.js";

/**
 * Run contract tests against InMemoryJobsRepo.
 * This validates that the test double behaves correctly.
 */
describe("inMemoryJobsRepo", () => {
  let currentTime: Date;

  const setup = () => {
    currentTime = new Date("2025-01-01T00:00:00Z");
    const now = () => currentTime;
    const setNow = (d: Date) => {
      currentTime = d;
    };
    const repo = new InMemoryJobsRepo(now);
    return { repo, now, setNow };
  };

  testJobsRepoContract(setup);
});

describe("inMemoryRunsRepo", () => {
  const setup = () => {
    const repo = new InMemoryRunsRepo();
    return { repo };
  };

  testRunsRepoContract(setup);
});
