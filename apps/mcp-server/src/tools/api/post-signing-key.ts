/**
 * POST /signing-keys - Create signing key
 *
 * 1:1 mapping to API endpoint
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  CreateSigningKeyDescription,
  CreateSigningKeySummary,
  base as signingKeysBase,
} from "@cronicorn/api-contracts/signing-keys";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

const EmptyInputSchema = z.object({});

const SigningKeyCreatedResponseSchema = signingKeysBase.SigningKeyCreatedResponseBaseSchema;

export function registerCreateSigningKey(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "createSigningKey",
    title: CreateSigningKeySummary,
    description: CreateSigningKeyDescription,
    inputSchema: toShape(EmptyInputSchema),
    outputSchema: toShape(SigningKeyCreatedResponseSchema),
    inputValidator: EmptyInputSchema,
    outputValidator: SigningKeyCreatedResponseSchema,
    method: "POST",
    path: "/signing-keys",
    transformInput: () => ({}),
    successMessage: output =>
      `Signing key created (prefix: ${output.keyPrefix}). IMPORTANT: Save this raw key securely — it will not be shown again: ${output.rawKey}`,
  });
}
