/**
 * Base Zod Schemas for Signing Keys (Pure)
 *
 * No OpenAPI decorations — usable by MCP server and web app.
 */

import { z } from "zod";

export const SigningKeyInfoResponseBaseSchema = z.object({
  hasKey: z.boolean(),
  keyPrefix: z.string().nullable(),
  createdAt: z.string().datetime().nullable(),
  rotatedAt: z.string().datetime().nullable(),
});

export const SigningKeyCreatedResponseBaseSchema = z.object({
  rawKey: z.string(),
  keyPrefix: z.string(),
});

// Summaries and descriptions for route registration
export const GetSigningKeySummary = "Get signing key info";
export const GetSigningKeyDescription = "Returns metadata about the user's signing key (prefix, dates). Never returns the raw key.";

export const CreateSigningKeySummary = "Generate signing key";
export const CreateSigningKeyDescription = "Generates a new HMAC-SHA256 signing key for outbound request verification. Returns the raw key once — store it securely. Returns 409 if a key already exists.";

export const RotateSigningKeySummary = "Rotate signing key";
export const RotateSigningKeyDescription = "Replaces the current signing key with a new one. The old key is immediately invalidated. Returns 404 if no key exists.";
