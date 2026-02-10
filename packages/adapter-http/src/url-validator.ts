/**
 * URL validation for SSRF protection.
 *
 * Prevents Server-Side Request Forgery by validating URLs before executing
 * HTTP requests. Blocks requests to:
 * - Localhost (127.0.0.1, ::1, localhost)
 * - Private networks (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
 * - Link-local addresses (169.254.x.x, fe80::/10)
 * - Non-HTTP(S) schemes (ftp://, file://, etc.)
 *
 * DNS resolution is performed to prevent DNS rebinding attacks where
 * a hostname initially resolves to a public IP but later resolves to
 * an internal IP.
 */

/**
 * Error thrown when a URL fails SSRF validation.
 */
export class UrlNotAllowedError extends Error {
  constructor(
    public readonly url: string,
    public readonly reason: string,
  ) {
    super(`URL not allowed: ${reason}`);
    this.name = "UrlNotAllowedError";
  }
}

/**
 * Result of URL validation.
 */
export type UrlValidationResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Options for URL validation.
 */
export type UrlValidatorOptions = {
  /**
   * Custom DNS resolver function. Defaults to Node.js dns.promises.resolve.
   * Useful for testing or using a custom resolver.
   */
  dnsResolve?: (hostname: string) => Promise<string[]>;
};

/**
 * Validates a URL for SSRF protection.
 *
 * Checks:
 * 1. URL scheme is HTTP or HTTPS
 * 2. Hostname resolves to a public IP address (not localhost, private, or link-local)
 *
 * @param url - URL string to validate
 * @param options - Optional configuration
 * @returns Validation result with allowed status and reason if blocked
 */
export async function validateUrl(
  url: string,
  options?: UrlValidatorOptions,
): Promise<UrlValidationResult> {
  // Parse URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  }
  catch {
    return { allowed: false, reason: "Invalid URL" };
  }

  // T004: Validate scheme (HTTP/HTTPS only)
  if (!isAllowedScheme(parsedUrl.protocol)) {
    return {
      allowed: false,
      reason: `Scheme '${parsedUrl.protocol.replace(":", "")}' not allowed. Only HTTP and HTTPS are permitted.`,
    };
  }

  // T002: Check if hostname is an IP address and validate it directly
  const hostname = parsedUrl.hostname;
  if (isIpAddress(hostname)) {
    if (isBlockedIp(hostname)) {
      return {
        allowed: false,
        reason: `IP address '${hostname}' is not allowed (localhost, private, or link-local range)`,
      };
    }
    return { allowed: true };
  }

  // T003: Block well-known localhost hostnames before DNS resolution
  // This provides defense-in-depth against DNS misconfigurations
  if (isLocalhostHostname(hostname)) {
    return {
      allowed: false,
      reason: `Hostname '${hostname}' is not allowed (resolves to localhost)`,
    };
  }

  // T003: Resolve hostname via DNS and validate resulting IPs
  try {
    const resolvedIps = await resolveHostname(hostname, options?.dnsResolve);

    if (resolvedIps.length === 0) {
      return { allowed: false, reason: `Could not resolve hostname '${hostname}'` };
    }

    // Check all resolved IPs - block if ANY resolve to blocked ranges
    for (const ip of resolvedIps) {
      if (isBlockedIp(ip)) {
        return {
          allowed: false,
          reason: `Hostname '${hostname}' resolves to blocked IP '${ip}'`,
        };
      }
    }

    return { allowed: true };
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { allowed: false, reason: `DNS resolution failed: ${message}` };
  }
}

/**
 * Asserts that a URL is allowed for SSRF protection.
 *
 * Use this function before making HTTP requests to untrusted URLs.
 * Throws UrlNotAllowedError if the URL fails validation.
 *
 * @param url - URL string to validate
 * @param options - Optional configuration
 * @throws UrlNotAllowedError if URL is not allowed
 *
 * @example
 * ```typescript
 * try {
 *   await assertUrlAllowed(endpoint.url);
 *   const response = await fetch(endpoint.url);
 * } catch (error) {
 *   if (error instanceof UrlNotAllowedError) {
 *     return { status: 'failed', errorMessage: error.message };
 *   }
 *   throw error;
 * }
 * ```
 */
export async function assertUrlAllowed(
  url: string,
  options?: UrlValidatorOptions,
): Promise<void> {
  const result = await validateUrl(url, options);

  if (!result.allowed) {
    throw new UrlNotAllowedError(url, result.reason);
  }
}

// ============================================================================
// Internal helper functions
// ============================================================================

/**
 * Checks if the URL scheme is allowed (HTTP or HTTPS only).
 * @internal
 */
function isAllowedScheme(protocol: string): boolean {
  return protocol === "http:" || protocol === "https:";
}

/**
 * Checks if a hostname is a well-known localhost name.
 * This provides defense-in-depth against DNS misconfigurations.
 * @internal
 */
function isLocalhostHostname(hostname: string): boolean {
  const lowercaseHostname = hostname.toLowerCase();

  // Direct localhost match
  if (lowercaseHostname === "localhost") {
    return true;
  }

  // localhost with domain suffix (e.g., localhost.localdomain)
  if (lowercaseHostname.startsWith("localhost.")) {
    return true;
  }

  // IPv4 localhost subdomains (e.g., anything.localhost)
  if (lowercaseHostname.endsWith(".localhost")) {
    return true;
  }

  return false;
}

/**
 * Checks if a string is an IP address (IPv4 or IPv6).
 * @internal
 */
function isIpAddress(hostname: string): boolean {
  // IPv6 addresses in URLs are enclosed in brackets (e.g., [::1])
  // Check for bracketed IPv6 first
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return true;
  }

  // Check for IPv4: simple regex for dotted decimal
  const ipv4Regex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    return true;
  }

  // Check for IPv6 without brackets (from DNS resolution)
  if (hostname.includes(":")) {
    return true;
  }

  return false;
}

/**
 * Checks if an IP address is in a blocked range.
 * Blocked ranges include:
 * - Localhost (127.0.0.0/8, ::1)
 * - Private networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Link-local (169.254.0.0/16, fe80::/10)
 * - Unspecified (0.0.0.0, ::)
 * - Broadcast (255.255.255.255)
 * - IPv6 unique local (fc00::/7)
 * - IPv4-mapped IPv6 addresses that map to blocked IPv4
 * @internal
 */
function isBlockedIp(ip: string): boolean {
  // Strip brackets from IPv6 addresses (URL parser keeps them)
  let cleanIp = ip;
  if (ip.startsWith("[") && ip.endsWith("]")) {
    cleanIp = ip.slice(1, -1);
  }

  // Handle IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
  const ipv4MappedMatch = cleanIp.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (ipv4MappedMatch && ipv4MappedMatch[1]) {
    return isBlockedIpv4(ipv4MappedMatch[1]);
  }

  // IPv4 checks
  if (cleanIp.includes(".") && !cleanIp.includes(":")) {
    return isBlockedIpv4(cleanIp);
  }

  // IPv6 checks
  return isBlockedIpv6(cleanIp);
}

/**
 * Checks if an IPv4 address is in a blocked range.
 * @internal
 */
function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);

  // Validate we have 4 valid octets
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) {
    // Invalid IPv4 - treat as blocked for safety
    return true;
  }

  const [octet1, octet2] = parts;

  // Unspecified: 0.0.0.0/8 (current network)
  if (octet1 === 0) {
    return true;
  }

  // Localhost: 127.0.0.0/8
  if (octet1 === 127) {
    return true;
  }

  // Private: 10.0.0.0/8
  if (octet1 === 10) {
    return true;
  }

  // Private: 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
  if (octet1 === 172 && octet2 !== undefined && octet2 >= 16 && octet2 <= 31) {
    return true;
  }

  // Private: 192.168.0.0/16
  if (octet1 === 192 && octet2 === 168) {
    return true;
  }

  // Link-local / APIPA: 169.254.0.0/16 (includes cloud metadata endpoints like 169.254.169.254)
  if (octet1 === 169 && octet2 === 254) {
    return true;
  }

  // Broadcast: 255.255.255.255
  if (parts.every(p => p === 255)) {
    return true;
  }

  return false;
}

/**
 * Checks if an IPv6 address is in a blocked range.
 * @internal
 */
function isBlockedIpv6(ip: string): boolean {
  const normalized = normalizeIpv6(ip);

  // Unspecified address: ::
  if (normalized === "0000:0000:0000:0000:0000:0000:0000:0000") {
    return true;
  }

  // Localhost: ::1
  if (normalized === "0000:0000:0000:0000:0000:0000:0000:0001") {
    return true;
  }

  // Link-local: fe80::/10 (fe80:: to febf::)
  // First 10 bits are 1111111010 (0xfe80 to 0xfebf)
  const firstSegment = normalized.substring(0, 4).toLowerCase();
  if (firstSegment >= "fe80" && firstSegment <= "febf") {
    return true;
  }

  // Unique local addresses (private): fc00::/7 (fc00:: - fdff::)
  // First 7 bits are 1111110 (0xfc or 0xfd first byte)
  const firstByte = firstSegment.substring(0, 2).toLowerCase();
  if (firstByte === "fc" || firstByte === "fd") {
    return true;
  }

  // IPv4-mapped IPv6 in expanded form: ::ffff:0:0 to ::ffff:ffff:ffff
  // These are handled above in isBlockedIp, but check for expanded form too
  if (normalized.startsWith("0000:0000:0000:0000:0000:ffff:")) {
    // Extract the IPv4 portion and check it
    const ipv4Hex = normalized.substring(30); // last 8 hex chars represent IPv4
    const ipv4 = hexToIpv4(ipv4Hex);
    if (ipv4) {
      return isBlockedIpv4(ipv4);
    }
  }

  return false;
}

/**
 * Normalizes an IPv6 address to full expanded form.
 * Converts :: shorthand and ensures consistent formatting.
 * @internal
 */
function normalizeIpv6(ip: string): string {
  // Remove zone ID if present (e.g., fe80::1%eth0)
  const zoneIndex = ip.indexOf("%");
  const cleanIp = zoneIndex !== -1 ? ip.substring(0, zoneIndex) : ip;

  let segments = cleanIp.toLowerCase().split(":");

  // Handle :: expansion
  const doubleColonIndex = cleanIp.indexOf("::");
  if (doubleColonIndex !== -1) {
    const before = cleanIp.substring(0, doubleColonIndex).split(":").filter(s => s !== "");
    const after = cleanIp.substring(doubleColonIndex + 2).split(":").filter(s => s !== "");
    const missing = 8 - before.length - after.length;
    segments = [...before, ...Array.from({ length: missing }, (): string => "0"), ...after];
  }

  // Pad each segment to 4 characters
  return segments.map(s => s.padStart(4, "0")).join(":");
}

/**
 * Converts the last 8 hex characters of an IPv6 address to IPv4 dotted decimal.
 * Used for checking IPv4-mapped IPv6 addresses.
 * @internal
 */
function hexToIpv4(hexPart: string): string | null {
  // hexPart is in format "xxxx:xxxx" where each xxxx represents 2 octets
  const parts = hexPart.split(":");
  if (parts.length !== 2) {
    return null;
  }

  const [high, low] = parts;
  if (!high || !low) {
    return null;
  }

  try {
    const octet1 = Number.parseInt(high.substring(0, 2), 16);
    const octet2 = Number.parseInt(high.substring(2, 4), 16);
    const octet3 = Number.parseInt(low.substring(0, 2), 16);
    const octet4 = Number.parseInt(low.substring(2, 4), 16);

    if ([octet1, octet2, octet3, octet4].some(o => Number.isNaN(o))) {
      return null;
    }

    return `${octet1}.${octet2}.${octet3}.${octet4}`;
  }
  catch {
    return null;
  }
}

/**
 * Resolves a hostname to IP addresses using DNS.
 * @internal
 */
async function resolveHostname(
  hostname: string,
  customResolver?: (hostname: string) => Promise<string[]>,
): Promise<string[]> {
  if (customResolver) {
    return customResolver(hostname);
  }

  // Use Node.js DNS resolver
  const dns = await import("node:dns");
  const dnsPromises = dns.promises;

  // Resolve both IPv4 and IPv6 addresses
  const results: string[] = [];

  try {
    const ipv4Addresses = await dnsPromises.resolve4(hostname);
    results.push(...ipv4Addresses);
  }
  catch {
    // IPv4 resolution failed - continue to try IPv6
  }

  try {
    const ipv6Addresses = await dnsPromises.resolve6(hostname);
    results.push(...ipv6Addresses);
  }
  catch {
    // IPv6 resolution failed - that's ok if we have IPv4
  }

  return results;
}
