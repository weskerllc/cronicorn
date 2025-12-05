/* eslint-disable no-console */

/**
 * Ensure Admin User Utility
 *
 * Creates the admin user directly in the database if it doesn't exist.
 * This allows the seed script to run standalone without requiring the API to be started first.
 *
 * Password is hashed using bcrypt (same as Better Auth) to ensure compatibility.
 * If the user already exists, this function is a no-op.
 *
 * NOTE: The API also creates this user on startup via Better Auth's signUpEmail.
 * Both approaches are compatible - whichever runs first creates the user.
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { schema } from "@cronicorn/adapter-drizzle";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm/sql/expressions/conditions";

type AdminUserConfig = {
  email: string;
  password: string;
  name: string;
};

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

  // Hash password using bcrypt (same algorithm as Better Auth)
  // Using 10 salt rounds (Better Auth default)
  const hashedPassword = await bcrypt.hash(config.password, 10);

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
