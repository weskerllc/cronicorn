/**
 * Secure local storage for OAuth credentials
 *
 * Stores access/refresh tokens in ~/.cronicorn/credentials.json
 * with strict file permissions (0600 = owner read/write only)
 */

import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CREDENTIALS_DIR = join(homedir(), ".cronicorn");
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, "credentials.json");

export type Credentials = {
    access_token: string;
    refresh_token: string;
    expires_at: number; // Unix timestamp in milliseconds
};

/**
 * Load credentials from disk
 * Returns null if file doesn't exist or is invalid
 */
export async function getCredentials(): Promise<Credentials | null> {
    try {
        const data = await fs.readFile(CREDENTIALS_FILE, "utf-8");
        const credentials: Credentials = JSON.parse(data);

        // Validate structure
        if (!credentials.access_token || !credentials.refresh_token || !credentials.expires_at) {
            console.error("⚠️  Invalid credentials file format");
            return null;
        }

        return credentials;
    }
    catch (error: any) {
        if (error.code === "ENOENT") {
            // File doesn't exist - first run
            return null;
        }
        console.error("Error reading credentials:", error.message);
        return null;
    }
}

/**
 * Save credentials to disk with secure permissions
 */
export async function saveCredentials(credentials: Credentials): Promise<void> {
    try {
        // Ensure directory exists
        await fs.mkdir(CREDENTIALS_DIR, { recursive: true });

        // Write credentials
        await fs.writeFile(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), {
            encoding: "utf-8",
            mode: 0o600, // Owner read/write only
        });

        console.error(`✅ Credentials saved to ${CREDENTIALS_FILE}`);
    }
    catch (error: any) {
        throw new Error(`Failed to save credentials: ${error.message}`);
    }
}

/**
 * Delete credentials (logout)
 */
export async function deleteCredentials(): Promise<void> {
    try {
        await fs.unlink(CREDENTIALS_FILE);
        console.error("✅ Credentials deleted");
    }
    catch (error: any) {
        if (error.code !== "ENOENT") {
            throw new Error(`Failed to delete credentials: ${error.message}`);
        }
    }
}

/**
 * Check if access token is expired (with 5 minute buffer)
 */
export function isTokenExpired(credentials: Credentials): boolean {
    const BUFFER_MS = 5 * 60 * 1000; // 5 minutes
    return Date.now() + BUFFER_MS >= credentials.expires_at;
}
