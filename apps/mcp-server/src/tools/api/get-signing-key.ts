/**
 * GET /signing-keys - Get signing key info
 *
 * 1:1 mapping to API endpoint
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  GetSigningKeyDescription,
  GetSigningKeySummary,
  base as signingKeysBase,
} from "@cronicorn/api-contracts/signing-keys";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

// No input params needed
const EmptyInputSchema = z.object({});

const SigningKeyInfoResponseSchema = signingKeysBase.SigningKeyInfoResponseBaseSchema;

export function registerGetSigningKey(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "getSigningKey",
    title: GetSigningKeySummary,
    description: GetSigningKeyDescription,
    inputSchema: toShape(EmptyInputSchema),
    outputSchema: toShape(SigningKeyInfoResponseSchema),
    inputValidator: EmptyInputSchema,
    outputValidator: SigningKeyInfoResponseSchema,
    method: "GET",
    path: "/signing-keys",
    successMessage: output =>
      output.hasKey
        ? `Signing key exists (prefix: ${output.keyPrefix}, created: ${output.createdAt})`
        : "No signing key configured. Use createSigningKey to generate one.",
  });
}
