import { describe, expect, it } from "vitest";

import { containsSensitiveHeaders, decryptHeaders, encryptHeaders } from "../crypto.js";

describe("encryption/decryption", () => {
  const testSecret = "test-secret-key-minimum-32-characters-long";
  const testHeaders = {
    "Authorization": "Bearer sk-test-1234567890",
    "X-API-Key": "secret-api-key-value",
    "Content-Type": "application/json",
  };

  it("should encrypt and decrypt headers correctly", () => {
    const encrypted = encryptHeaders(testHeaders, testSecret);
    expect(encrypted).toContain(":"); // Format check
    expect(encrypted.split(":")).toHaveLength(3); // iv:authTag:encrypted

    const decrypted = decryptHeaders(encrypted, testSecret);
    expect(decrypted).toEqual(testHeaders);
  });

  it("should produce different ciphertext for same input (random IV)", () => {
    const encrypted1 = encryptHeaders(testHeaders, testSecret);
    const encrypted2 = encryptHeaders(testHeaders, testSecret);

    // Different IVs should produce different ciphertext
    expect(encrypted1).not.toEqual(encrypted2);

    // But both should decrypt to same value
    expect(decryptHeaders(encrypted1, testSecret)).toEqual(testHeaders);
    expect(decryptHeaders(encrypted2, testSecret)).toEqual(testHeaders);
  });

  it("should fail decryption with wrong secret", () => {
    const encrypted = encryptHeaders(testHeaders, testSecret);
    const wrongSecret = "different-secret-key-32-chars-min";

    expect(() => decryptHeaders(encrypted, wrongSecret)).toThrow();
  });

  it("should fail with invalid encrypted data format", () => {
    expect(() => decryptHeaders("invalid-data", testSecret)).toThrow("Invalid encrypted data format");
    expect(() => decryptHeaders("only:two", testSecret)).toThrow("Invalid encrypted data format");
  });

  it("should fail with corrupted ciphertext", () => {
    const encrypted = encryptHeaders(testHeaders, testSecret);
    const [iv, authTag, ciphertext] = encrypted.split(":");

    // Corrupt the ciphertext
    const corruptedData = `${iv}:${authTag}:${ciphertext}XXX`;

    expect(() => decryptHeaders(corruptedData, testSecret)).toThrow();
  });

  it("should require minimum secret length", () => {
    const shortSecret = "short";

    expect(() => encryptHeaders(testHeaders, shortSecret)).toThrow(
      "Encryption secret must be at least 32 characters",
    );

    expect(() => decryptHeaders("iv:tag:data", shortSecret)).toThrow(
      "Encryption secret must be at least 32 characters",
    );
  });

  it("should handle empty headers object", () => {
    const emptyHeaders = {};
    const encrypted = encryptHeaders(emptyHeaders, testSecret);
    const decrypted = decryptHeaders(encrypted, testSecret);

    expect(decrypted).toEqual(emptyHeaders);
  });

  it("should handle headers with special characters", () => {
    const specialHeaders = {
      "Authorization": "Bearer token_with-special.chars/+=",
      "Custom-Header": "Value with \"quotes\" and \\backslashes",
      "Unicode": "Hello 世界 🌍",
    };

    const encrypted = encryptHeaders(specialHeaders, testSecret);
    const decrypted = decryptHeaders(encrypted, testSecret);

    expect(decrypted).toEqual(specialHeaders);
  });
});

describe("containsSensitiveHeaders", () => {
  it("should detect Authorization header", () => {
    expect(containsSensitiveHeaders({ Authorization: "Bearer token" })).toBe(true);
    expect(containsSensitiveHeaders({ authorization: "Bearer token" })).toBe(true);
    expect(containsSensitiveHeaders({ AUTHORIZATION: "Bearer token" })).toBe(true);
  });

  it("should detect API key headers", () => {
    expect(containsSensitiveHeaders({ "API-Key": "key" })).toBe(true);
    expect(containsSensitiveHeaders({ "api-key": "key" })).toBe(true);
    expect(containsSensitiveHeaders({ ApiKey: "key" })).toBe(true);
    expect(containsSensitiveHeaders({ "X-API-Key": "key" })).toBe(true);
    expect(containsSensitiveHeaders({ "x-api-key": "key" })).toBe(true);
  });

  it("should detect token/secret/auth headers", () => {
    expect(containsSensitiveHeaders({ Token: "abc" })).toBe(true);
    expect(containsSensitiveHeaders({ Secret: "abc" })).toBe(true);
    expect(containsSensitiveHeaders({ Password: "abc" })).toBe(true);
    expect(containsSensitiveHeaders({ Auth: "abc" })).toBe(true);
    expect(containsSensitiveHeaders({ Bearer: "abc" })).toBe(true);
  });

  it("should not flag non-sensitive headers", () => {
    expect(containsSensitiveHeaders({ "Content-Type": "application/json" })).toBe(false);
    expect(containsSensitiveHeaders({ Accept: "application/json" })).toBe(false);
    expect(containsSensitiveHeaders({ "User-Agent": "Mozilla" })).toBe(false);
    expect(containsSensitiveHeaders({ "X-Custom-Header": "value" })).toBe(false);
  });

  it("should handle empty headers", () => {
    expect(containsSensitiveHeaders({})).toBe(false);
  });

  it("should detect if any header is sensitive", () => {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": "Bearer token", // Sensitive
      "Accept": "*/*",
    };

    expect(containsSensitiveHeaders(headers)).toBe(true);
  });
});
