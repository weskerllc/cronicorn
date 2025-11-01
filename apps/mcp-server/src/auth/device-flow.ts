/**
 * OAuth 2.0 Device Authorization Grant (RFC 8628)
 *
 * Implements device flow for MCP server authentication:
 * 1. Request device code from Cronicorn API
 * 2. Display user code and open browser
 * 3. Poll for token
 * 4. Store credentials securely
 */

import open from "open";

import { saveCredentials } from "./token-store.js";

const API_URL = process.env.CRONICORN_API_URL || "https://api.cronicorn.com";
const WEB_URL = process.env.CRONICORN_WEB_URL || "https://app.cronicorn.com";

type DeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

type Credentials = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

/**
 * Initiate OAuth device authorization flow
 */
export async function authenticate(): Promise<Credentials> {
  // Step 1: Request device code
  const deviceCodeRes = await fetch(`${API_URL}/auth/device-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!deviceCodeRes.ok) {
    throw new Error(`Failed to request device code: ${deviceCodeRes.statusText}`);
  }

  const deviceData: DeviceCodeResponse = await deviceCodeRes.json();

  // Step 2: Display instructions to user
  const verificationUrl = `${WEB_URL}/device/approve`;
  console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("🔐 Cronicorn Device Authorization");
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error(`\n1. Opening browser to: ${verificationUrl}`);
  console.error(`2. Enter this code: ${deviceData.user_code}`);
  console.error(`\n   Code expires in ${Math.floor(deviceData.expires_in / 60)} minutes\n`);

  // Open browser automatically
  try {
    await open(verificationUrl);
  }
  catch (error) {
    console.error("⚠️  Could not open browser automatically");
  }

  // Step 3: Poll for token
  const token = await pollForToken(
    deviceData.device_code,
    deviceData.interval,
    deviceData.expires_in,
  );

  // Step 4: Save credentials
  const credentials: Credentials = {
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: Date.now() + token.expires_in * 1000,
  };

  await saveCredentials(credentials);
  return credentials;
}

/**
 * Poll token endpoint until user approves or timeout
 */
async function pollForToken(
  deviceCode: string,
  intervalSeconds: number,
  expiresIn: number,
): Promise<TokenResponse> {
  const startTime = Date.now();
  const expiresAt = startTime + expiresIn * 1000;

  while (Date.now() < expiresAt) {
    await sleep(intervalSeconds * 1000);

    const tokenRes = await fetch(`${API_URL}/auth/device-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_code: deviceCode }),
    });

    if (tokenRes.ok) {
      return await tokenRes.json();
    }

    const error = await tokenRes.json().catch(() => ({}));

    if (error.error === "authorization_pending") {
      console.error("⏳ Waiting for authorization...");
      continue;
    }

    if (error.error === "slow_down") {
      // Server requested slower polling
      await sleep(5000);
      continue;
    }

    // Other errors (expired_token, access_denied, etc.)
    throw new Error(`Device authorization failed: ${error.error || tokenRes.statusText}`);
  }

  throw new Error("Device code expired - authorization timed out");
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
