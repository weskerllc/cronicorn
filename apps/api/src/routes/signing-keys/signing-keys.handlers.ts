import { DrizzleSigningKeyRepo } from "@cronicorn/adapter-drizzle";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "../../types.js";
import type * as routes from "./signing-keys.routes.js";

import { getAuthContext } from "../../auth/middleware.js";

export const getSigningKey: AppRouteHandler<routes.GetSigningKeyRoute> = async (c) => {
  const { userId } = getAuthContext(c);
  const db = c.get("db");
  // @ts-expect-error - Drizzle type mismatch between pnpm versions
  const repo = new DrizzleSigningKeyRepo(db);
  const info = await repo.getInfo(userId);

  return c.json({
    hasKey: info.hasKey,
    keyPrefix: info.keyPrefix,
    createdAt: info.createdAt?.toISOString() ?? null,
    rotatedAt: info.rotatedAt?.toISOString() ?? null,
  }, HttpStatusCodes.OK);
};

export const createSigningKey: AppRouteHandler<routes.CreateSigningKeyRoute> = async (c) => {
  const { userId } = getAuthContext(c);
  const db = c.get("db");
  // @ts-expect-error - Drizzle type mismatch between pnpm versions
  const repo = new DrizzleSigningKeyRepo(db);

  // Check if key already exists
  const existing = await repo.getInfo(userId);
  if (existing.hasKey) {
    return c.json({ message: "Signing key already exists. Use POST /signing-keys/rotate to replace it." }, HttpStatusCodes.CONFLICT);
  }

  const result = await repo.create(userId);
  return c.json(result, HttpStatusCodes.CREATED);
};

export const rotateSigningKey: AppRouteHandler<routes.RotateSigningKeyRoute> = async (c) => {
  const { userId } = getAuthContext(c);
  const db = c.get("db");
  // @ts-expect-error - Drizzle type mismatch between pnpm versions
  const repo = new DrizzleSigningKeyRepo(db);

  // Check if key exists
  const existing = await repo.getInfo(userId);
  if (!existing.hasKey) {
    return c.json({ message: "No signing key exists. Use POST /signing-keys to create one." }, HttpStatusCodes.NOT_FOUND);
  }

  const result = await repo.rotate(userId);
  return c.json(result, HttpStatusCodes.OK);
};
