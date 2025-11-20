import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encryption utility for sensitive endpoint data (headers, auth tokens).
 *
 * Uses AES-256-GCM for authenticated encryption.
 * Key is derived from BETTER_AUTH_SECRET environment variable.
 *
 * Format: iv:authTag:encryptedData (all base64)
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits

/**
 * Derives a 256-bit encryption key from the auth secret using SHA-256.
 */
function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a JSON object containing sensitive headers.
 *
 * @param data - Plain object to encrypt (e.g., { "Authorization": "Bearer token" })
 * @param secret - Encryption secret (typically BETTER_AUTH_SECRET)
 * @returns Encrypted string in format: iv:authTag:encryptedData (base64)
 */
export function encryptHeaders(data: Record<string, string>, secret: string): string {
  if (!secret || secret.length < 32) {
    throw new Error("Encryption secret must be at least 32 characters");
  }

  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(data);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypts encrypted headers back to a plain JSON object.
 *
 * @param encryptedData - Encrypted string from encryptHeaders()
 * @param secret - Encryption secret (same as used for encryption)
 * @returns Decrypted headers object
 * @throws Error if decryption fails (wrong key, corrupted data, etc.)
 */
export function decryptHeaders(encryptedData: string, secret: string): Record<string, string> {
  if (!secret || secret.length < 32) {
    throw new Error("Encryption secret must be at least 32 characters");
  }

  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivBase64, authTagBase64, encryptedBase64] = parts;
  const key = deriveKey(secret);
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}

/**
 * Checks if headers contain sensitive values that should be encrypted.
 * Headers like Authorization, API-Key, X-API-Key, etc. are considered sensitive.
 */
export function containsSensitiveHeaders(headers: Record<string, string>): boolean {
  const sensitivePatterns = [
    /^authorization$/i,
    /^api-?key$/i,
    /^x-api-?key$/i,
    /^bearer$/i,
    /^token$/i,
    /^secret$/i,
    /^password$/i,
    /^auth$/i,
  ];

  return Object.keys(headers).some(key =>
    sensitivePatterns.some(pattern => pattern.test(key)),
  );
}
