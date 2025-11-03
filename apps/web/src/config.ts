/**
 * Runtime Configuration
 * App-specific runtime settings (env vars, etc.)
 * 
 * Note: All marketing content has been moved to @cronicorn/content package
 */

/** Base URL for the web application (from environment variable) */
export const APP_URL = import.meta.env.VITE_SITE_URL || "http://localhost:5173";
