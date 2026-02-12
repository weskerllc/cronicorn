/**
 * POST /signing-keys/rotate - Rotate signing key
 *
 * 1:1 mapping to API endpoint
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  RotateSigningKeyDescription,
  RotateSigningKeySummary,
  base as signingKeysBase,
} from "@cronicorn/api-contracts/signing-keys";
import { z } from "zod";

import type { ApiClient } from "../../ports/api-client.js";

import { registerApiTool, toShape } from "../helpers/index.js";

const EmptyInputSchema = z.object({});

const SigningKeyCreatedResponseSchema = signingKeysBase.SigningKeyCreatedResponseBaseSchema;

export function registerRotateSigningKey(server: McpServer, apiClient: ApiClient) {
  registerApiTool(server, apiClient, {
    name: "rotateSigningKey",
    title: RotateSigningKeySummary,
    description: RotateSigningKeyDescription,
    inputSchema: toShape(EmptyInputSchema),
    outputSchema: toShape(SigningKeyCreatedResponseSchema),
    inputValidator: EmptyInputSchema,
    outputValidator: SigningKeyCreatedResponseSchema,
    method: "POST",
    path: "/signing-keys/rotate",
    transformInput: () => ({}),
    successMessage: output =>
      `Signing key rotated (new prefix: ${output.keyPrefix}). Old key is immediately invalid. Save the new raw key securely — it will not be shown again: ${output.rawKey}`,
  });
}
