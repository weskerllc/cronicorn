/* eslint-disable no-console */

/**
 * Ensure Admin User Utility
 *
 * Creates the admin user directly in the database if it doesn't exist.
 * This allows the seed script to run standalone without requiring the API to be started first.
 *
 * Password is hashed using scrypt (same as Better Auth) to ensure compatibility.
 * Better Auth uses the format: `salt:hex_encoded_key`
 *
 * If the user already exists, this function is a no-op.
 *
 * NOTE: The API also creates this user on startup via Better Auth's signUpEmail.
 * Both approaches are compatible - whichever runs first creates the user.
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { schema } from "@cronicorn/adapter-drizzle";
import { scryptAsync } from "@noble/hashes/scrypt";
import { bytesToHex } from "@noble/hashes/utils";
import { eq } from "drizzle-orm/sql/expressions/conditions";

type AdminUserConfig = {
  email: string;
  password: string;
  name: string;
};

/**
 * Hash password using scrypt - matching Better Auth's implementation exactly.
 * Better Auth uses: N=16384, r=16, p=1, dkLen=64
 * Format: `salt:hex_encoded_key`
 */
async function hashPassword(password: string): Promise<string> {
  // Generate 16 random bytes for salt, encode as hex
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToHex(saltBytes);

  // Use same scrypt params as Better Auth (including NFKC normalization and dkLen=64)
  const key = await scryptAsync(
    password.normalize("NFKC"),
    salt,
    { N: 16384, r: 16, p: 1, dkLen: 64, maxmem: 128 * 16384 * 16 * 2 },
  );

  return `${salt}:${bytesToHex(key)}`;
}

/**
 * Ensures the admin user exists in the database.
 * Creates both user and account records if they don't exist.
 *
 * @param db - Drizzle database instance
 * @param config - Admin user configuration (email, password, name)
 * @returns The user ID (existing or newly created)
 */
export async function ensureAdminUser(
  db: NodePgDatabase<typeof schema>,
  config: AdminUserConfig,
): Promise<string> {
  // Check if user already exists by email
  const existingUsers = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, config.email))
    .limit(1);

  if (existingUsers.length > 0) {
    // User already exists - return existing ID
    console.log(`✓ Admin user already exists (ID: ${existingUsers[0].id})\n`);
    return existingUsers[0].id;
  }

  console.log("➤ Creating admin user...");

  // Generate IDs for new records
  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const now = new Date();

  // Hash password using scrypt (same algorithm as Better Auth)
  // Better Auth format: `salt:hex_encoded_key`
  const hashedPassword = await hashPassword(config.password);

  // Create user record
  await db.insert(schema.user).values({
    id: userId,
    name: config.name,
    email: config.email,
    emailVerified: true, // Admin user is pre-verified
    createdAt: now,
    updatedAt: now,
  });

  // Create account record (Better Auth credential storage)
  await db.insert(schema.account).values({
    id: accountId,
    accountId: userId, // For email/password auth, accountId = userId
    providerId: "credential", // Better Auth's provider ID for email/password
    userId,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`✓ Admin user created (ID: ${userId})\n`);

  return userId;
}
