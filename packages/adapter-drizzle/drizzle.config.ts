import { DEV_DATABASE } from "@cronicorn/config-defaults";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: {
    // eslint-disable-next-line node/no-process-env
    url: process.env.DATABASE_URL || DEV_DATABASE.URL,
  },
});
