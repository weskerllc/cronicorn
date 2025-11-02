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
  session_token?: string; // Better Auth includes this
};

type TokenWithCookies = {
  token: TokenResponse;
  cookies: string[];
};

type Credentials = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

/**
 * Initiate OAuth device authorization flow
 */
export async function authenticate({ apiUrl, webUrl }: { apiUrl: string; webUrl: string }): Promise<Credentials> {
  // Step 1: Request device code
  const deviceCodeRes = await fetch(`${apiUrl}/auth/device/code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: "cronicorn-mcp-server",
      scope: "openid profile email",
    }),
  });

  if (!deviceCodeRes.ok) {
    throw new Error(`Failed to request device code: ${deviceCodeRes.statusText}`);
  }

  const deviceData: DeviceCodeResponse = await deviceCodeRes.json();

  // Step 2: Display instructions to user
  const verificationUrl = `${webUrl}/device/approve?user_code=${deviceData.user_code}`;
  console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("🔐 Cronicorn Device Authorization");
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error(`\n1. Opening browser to: ${verificationUrl}`);
  console.error(`2. User code: ${deviceData.user_code}`);
  console.error(`\n   Code expires in ${Math.floor(deviceData.expires_in / 60)} minutes\n`);

  // Open browser automatically
  try {
    await open(verificationUrl);
  }
  catch (error) {
    console.error("⚠️  Could not open browser automatically", error);
  }

  // Step 3: Poll for token
  const { token } = await pollForToken(
    deviceData.device_code,
    deviceData.interval,
    deviceData.expires_in,
    apiUrl,
  );

  console.error("✅ Authorization successful!");

  // Step 4: Save access token as credentials (use directly with Bearer auth)
  const expiresAtTimestamp = Date.now() + (token.expires_in * 1000);
  const credentials: Credentials = {
    access_token: token.access_token,
    refresh_token: token.refresh_token || "",
    expires_at: expiresAtTimestamp,
  };

  await saveCredentials(credentials);

  // Log expiry information
  const expiresAtDate = new Date(expiresAtTimestamp);
  const daysUntilExpiry = Math.floor((expiresAtTimestamp - Date.now()) / (1000 * 60 * 60 * 24));
  console.error("✅ Credentials saved!");
  console.error(`📅 Token expires: ${expiresAtDate.toISOString()} (in ~${daysUntilExpiry} days)`);

  return credentials;
}

/**
 * Poll token endpoint until user approves or timeout
 */
async function pollForToken(
  deviceCode: string,
  intervalSeconds: number,
  expiresIn: number,
  apiUrl: string,
): Promise<TokenWithCookies> {
  const startTime = Date.now();
  const expiresAt = startTime + expiresIn * 1000;

  while (Date.now() < expiresAt) {
    await sleep(intervalSeconds * 1000);

    const tokenRes = await fetch(`${apiUrl}/auth/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: deviceCode,
        client_id: "cronicorn-mcp-server",
      }),
    });

    if (tokenRes.ok) {
      const token = await tokenRes.json();
      // Get all Set-Cookie headers (not used with Bearer token auth)
      const setCookieHeaders = tokenRes.headers.getSetCookie?.() || [];
      return { token, cookies: setCookieHeaders };
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
