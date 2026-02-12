import {
  CreateSigningKeyDescription,
  CreateSigningKeySummary,
  GetSigningKeyDescription,
  GetSigningKeySummary,
  RotateSigningKeyDescription,
  RotateSigningKeySummary,
  SigningKeyCreatedResponseBaseSchema,
  SigningKeyInfoResponseBaseSchema,
} from "@cronicorn/api-contracts/signing-keys";
import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const tags = ["Signing Keys"];
const errorResponses = {
  [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
    z.object({ message: z.string() }),
    "Authentication required",
  ),
  [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
    z.object({ message: z.string() }),
    "Internal server error",
  ),
};

export const getSigningKey = createRoute({
  path: "/signing-keys",
  method: "get",
  tags,
  summary: GetSigningKeySummary,
  description: GetSigningKeyDescription,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(SigningKeyInfoResponseBaseSchema, "Signing key info"),
    ...errorResponses,
  },
});

export const createSigningKey = createRoute({
  path: "/signing-keys",
  method: "post",
  tags,
  summary: CreateSigningKeySummary,
  description: CreateSigningKeyDescription,
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(SigningKeyCreatedResponseBaseSchema, "Signing key created"),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({ message: z.string() }),
      "Signing key already exists",
    ),
    ...errorResponses,
  },
});

export const rotateSigningKey = createRoute({
  path: "/signing-keys/rotate",
  method: "post",
  tags,
  summary: RotateSigningKeySummary,
  description: RotateSigningKeyDescription,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(SigningKeyCreatedResponseBaseSchema, "New signing key"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({ message: z.string() }),
      "No signing key exists",
    ),
    ...errorResponses,
  },
});

// Type exports for handlers
export type GetSigningKeyRoute = typeof getSigningKey;
export type CreateSigningKeyRoute = typeof createSigningKey;
export type RotateSigningKeyRoute = typeof rotateSigningKey;
