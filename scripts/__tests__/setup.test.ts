import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SETUP_SCRIPT = resolve(import.meta.dirname, "../setup.sh");

/**
 * Create a mock docker binary that passes prerequisite checks.
 * Returns the path to prepend to $PATH.
 */
function createMockDocker(cwd: string): string {
  const mockBin = join(cwd, "bin");
  execSync(`mkdir -p "${mockBin}"`, { cwd });

  writeFileSync(
    join(mockBin, "docker"),
    `#!/usr/bin/env bash
if [[ "$1" == "version" ]]; then echo "27.0.0"; exit 0; fi
if [[ "$1" == "compose" && "$2" == "version" && "$3" == "--short" ]]; then echo "2.30.0"; exit 0; fi
if [[ "$1" == "compose" && "$2" == "version" ]]; then exit 0; fi
if [[ "$1" == "compose" && "$2" == "pull" ]]; then exit 0; fi
exit 0
`,
    { mode: 0o755 },
  );

  return mockBin;
}

/**
 * Run the setup script in a temp directory with mocked Docker.
 */
function runSetup(
  cwd: string,
  opts: { dryRun?: boolean; mockBin?: string } = {},
) {
  const { dryRun = true, mockBin } = opts;
  const bin = mockBin ?? createMockDocker(cwd);
  const args = dryRun ? "--dry-run" : "";

  return execSync(`PATH="${bin}:$PATH" bash "${SETUP_SCRIPT}" ${args} 2>&1`, {
    cwd,
    encoding: "utf-8",
    timeout: 10_000,
  });
}

describe("scripts/setup.sh", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "cronicorn-setup-test-"));
  });

  afterEach(() => {
    execSync(`rm -rf "${tempDir}"`);
  });

  describe("prerequisite checks", () => {
    it("should pass all prerequisite checks in dry-run mode", () => {
      const output = runSetup(tempDir);
      expect(output).toContain("Docker 27.0.0");
      expect(output).toContain("Docker Compose 2.30.0");
      expect(output).toContain("openssl available");
      expect(output).toContain("Dry run");
    });

    it("should fail when docker is too old", () => {
      const mockBin = join(tempDir, "bin");
      execSync(`mkdir -p "${mockBin}"`);
      writeFileSync(
        join(mockBin, "docker"),
        `#!/usr/bin/env bash
if [[ "$1" == "version" ]]; then echo "20.10.24"; exit 0; fi
exit 0
`,
        { mode: 0o755 },
      );

      expect(() =>
        runSetup(tempDir, { mockBin }),
      ).toThrow();
    });
  });

  describe("file downloads (dry-run)", () => {
    it("should indicate compose file would be downloaded when missing", () => {
      const output = runSetup(tempDir);
      expect(output).toContain("Would download docker-compose.yml");
    });

    it("should skip downloading compose file when it already exists", () => {
      writeFileSync(join(tempDir, "docker-compose.yml"), "services: {}\n");
      const output = runSetup(tempDir);
      expect(output).toContain("docker-compose.yml already exists");
      expect(output).not.toContain("Would download docker-compose.yml");
    });

    it("should indicate .env would be generated when missing", () => {
      const output = runSetup(tempDir);
      expect(output).toContain("Would generate .env");
    });

    it("should skip .env generation when .env already exists", () => {
      writeFileSync(join(tempDir, ".env"), "BETTER_AUTH_SECRET=existing\n");
      const output = runSetup(tempDir);
      expect(output).toContain(".env already exists");
      expect(output).not.toContain("Would generate .env");
    });

    it("should warn about placeholder BETTER_AUTH_SECRET in existing .env", () => {
      writeFileSync(
        join(tempDir, ".env"),
        "BETTER_AUTH_SECRET=your-secret-here\n",
      );
      const output = runSetup(tempDir);
      expect(output).toContain("BETTER_AUTH_SECRET looks unset");
    });
  });

  describe(".env generation (non-dry-run)", () => {
    function runWithEnvGeneration(cwd: string) {
      // Place files so the script doesn't try to curl
      writeFileSync(join(cwd, "docker-compose.yml"), "services: {}\n");
      writeFileSync(
        join(cwd, "docker-compose.override.yml.example"),
        "# example\n",
      );
      return runSetup(cwd, { dryRun: false });
    }

    it("should generate a .env with a secure secret", () => {
      const output = runWithEnvGeneration(tempDir);

      expect(output).toContain(
        ".env generated with secure BETTER_AUTH_SECRET",
      );
      expect(output).toContain("Setup complete!");

      const envPath = join(tempDir, ".env");
      expect(existsSync(envPath)).toBe(true);

      const envContent = readFileSync(envPath, "utf-8");
      expect(envContent).toContain("BETTER_AUTH_SECRET=");

      // Extract the secret value
      const match = envContent.match(/BETTER_AUTH_SECRET=(.+)/);
      expect(match).not.toBeNull();
      const secret = match![1];

      // openssl rand -base64 32 produces 44 characters
      expect(secret.length).toBeGreaterThanOrEqual(32);
    });

    it("should not overwrite an existing .env", () => {
      const original = "BETTER_AUTH_SECRET=my-original-secret\n";
      writeFileSync(join(tempDir, ".env"), original);

      runWithEnvGeneration(tempDir);

      const envContent = readFileSync(join(tempDir, ".env"), "utf-8");
      expect(envContent).toBe(original);
    });

    it("should generate unique secrets on each run", () => {
      const dir1 = mkdtempSync(join(tmpdir(), "cronicorn-setup-unique1-"));
      const dir2 = mkdtempSync(join(tmpdir(), "cronicorn-setup-unique2-"));

      try {
        runWithEnvGeneration(dir1);
        runWithEnvGeneration(dir2);

        const env1 = readFileSync(join(dir1, ".env"), "utf-8");
        const env2 = readFileSync(join(dir2, ".env"), "utf-8");

        const secret1 = env1.match(/BETTER_AUTH_SECRET=(.+)/)![1];
        const secret2 = env2.match(/BETTER_AUTH_SECRET=(.+)/)![1];

        expect(secret1).not.toBe(secret2);
      } finally {
        execSync(`rm -rf "${dir1}" "${dir2}"`);
      }
    });
  });
});
