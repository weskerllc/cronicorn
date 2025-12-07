#!/usr/bin/env tsx
/* eslint-disable node/no-process-env, no-console */
/**
 * Idempotent Metabase bootstrap for dev/prod.
 * - Runs /api/setup if Metabase is not initialized.
 * - Logs in and ensures the analytics database connection exists.
 *
 * Defaults match local docker-compose: Metabase at http://localhost:3030 and
 * analytics DB at host.docker.internal:5432 (db/user/password).
 */

const MB_URL = process.env.MB_URL ?? "http://localhost:3030";
const ADMIN_EMAIL = process.env.MB_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.MB_ADMIN_PASSWORD ?? "devpassword123!";
const SITE_NAME = process.env.MB_SITE_NAME ?? "Cronicorn";

const ANALYTICS_DB_HOST = process.env.MB_ANALYTICS_DB_HOST ?? "host.docker.internal";
const ANALYTICS_DB_PORT = Number(process.env.MB_ANALYTICS_DB_PORT ?? 5432);
const ANALYTICS_DB_NAME = process.env.MB_ANALYTICS_DB_NAME ?? "db";
const ANALYTICS_DB_USER = process.env.MB_ANALYTICS_DB_USER ?? "user";
const ANALYTICS_DB_PASSWORD = process.env.MB_ANALYTICS_DB_PASSWORD ?? "password";
const ANALYTICS_DB_DISPLAY_NAME = process.env.MB_ANALYTICS_DB_DISPLAY_NAME ?? "Cronicorn Analytics";

async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${MB_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText} on ${path}: ${text}`);
  }
  return res.json();
}

async function getSetupToken(): Promise<string | null> {
    type Props = { "setup-token": string | null };
    const props = await fetchJson<Props>("/api/session/properties");
    return props["setup-token"];
}

async function runSetup(setupToken: string): Promise<void> {
  await fetchJson("/api/setup", {
    method: "POST",
    body: JSON.stringify({
      token: setupToken,
      user: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        password_confirm: ADMIN_PASSWORD,
        first_name: "Admin",
        last_name: "User",
      },
      prefs: {
        site_name: SITE_NAME,
        site_locale: "en",
      },
      database: {
        engine: "postgres",
        name: ANALYTICS_DB_DISPLAY_NAME,
        details: {
          host: ANALYTICS_DB_HOST,
          port: ANALYTICS_DB_PORT,
          dbname: ANALYTICS_DB_NAME,
          user: ANALYTICS_DB_USER,
          password: ANALYTICS_DB_PASSWORD,
          ssl: false,
        },
      },
    }),
  });
  console.log("Metabase setup completed");
}

async function login(): Promise<string> {
    type Session = { id: string };
    const session = await fetchJson<Session>("/api/session", {
      method: "POST",
      body: JSON.stringify({ username: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    return session.id;
}

async function ensureDatabase(sessionId: string): Promise<void> {
    type Db = { id: number; name: string };
    const existing = await fetchJson<{ data: Db[] }>("/api/database", {
      headers: { Cookie: `metabase.SESSION=${sessionId}` },
    });
    const found = existing.data.find(db => db.name === ANALYTICS_DB_DISPLAY_NAME);
    if (found) {
      console.log(`Database already present: ${found.name}`);
      return;
    }

    await fetchJson("/api/database", {
      method: "POST",
      headers: { Cookie: `metabase.SESSION=${sessionId}` },
      body: JSON.stringify({
        name: ANALYTICS_DB_DISPLAY_NAME,
        engine: "postgres",
        details: {
          host: ANALYTICS_DB_HOST,
          port: ANALYTICS_DB_PORT,
          dbname: ANALYTICS_DB_NAME,
          user: ANALYTICS_DB_USER,
          password: ANALYTICS_DB_PASSWORD,
          ssl: false,
        },
        is_full_sync: true,
        schedules: {},
      }),
    });
    console.log(`Database created: ${ANALYTICS_DB_DISPLAY_NAME}`);
}

async function main() {
  try {
    const token = await getSetupToken();
    if (token) {
      console.log("Metabase not initialized; running setup...");
      await runSetup(token);
    }
    else {
      console.log("Metabase already initialized; skipping setup");
    }

    const sessionId = await login();
    await ensureDatabase(sessionId);

    console.log("Provisioning complete");
  }
  catch (err) {
    console.error("Provisioning failed", err);
    process.exit(1);
  }
}

main();
