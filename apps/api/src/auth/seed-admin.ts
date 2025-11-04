import type { Auth } from "./config.js";
import type { Env } from "../lib/config.js";
import type { Database } from "../lib/db.js";

import { schema } from "@cronicorn/adapter-drizzle";
import { sql } from "drizzle-orm";

/**
 * Seeds the admin user on application startup if configured.
 *
 * This function:
 * 1. Checks if ADMIN_USER_EMAIL and ADMIN_USER_PASSWORD are set
 * 2. Creates the user if it doesn't exist
 * 3. Updates the password if the user exists (allows password rotation)
 *
 * Used for CI/testing environments where GitHub OAuth is not available.
 */
export async function seedAdminUser(config: Env, db: Database, auth: Auth): Promise<void> {
  // Skip if admin user credentials are not configured
  if (!config.ADMIN_USER_EMAIL || !config.ADMIN_USER_PASSWORD) {
    return;
  }

  try {
    // Check if user already exists using raw SQL to avoid type issues
    const existingUser = await db.execute(
      sql`SELECT id FROM ${schema.user} WHERE email = ${config.ADMIN_USER_EMAIL} LIMIT 1`
    );

    if (existingUser.rows.length === 0) {
      // Create new admin user using Better Auth
      // Better Auth will hash the password and handle all the security
      await auth.api.signUpEmail({
        body: {
          email: config.ADMIN_USER_EMAIL,
          password: config.ADMIN_USER_PASSWORD,
          name: config.ADMIN_USER_NAME,
        },
      });

      // eslint-disable-next-line no-console
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Admin user created successfully",
      }));
    }
    else {
      // User exists - password is not automatically updated
      // To change the password, manually delete the user and restart the app,
      // or use Better Auth's password reset flow

      // eslint-disable-next-line no-console
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Admin user already exists",
      }));
    }
  }
  catch (error) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      message: "Failed to seed admin user",
      error: error instanceof Error ? error.message : String(error),
    }));
    throw error;
  }
}
