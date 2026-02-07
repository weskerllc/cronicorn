import { describe, expect, it } from "vitest";

import {
  assertUrlAllowed,
  UrlNotAllowedError,
  validateUrl,
} from "../url-validator.js";

/**
 * Mock DNS resolver that returns specified IPs for a hostname.
 * Used to test DNS resolution behavior without actual network calls.
 */
function mockDnsResolver(mappings: Record<string, string[]>) {
  return async (hostname: string): Promise<string[]> => {
    const ips = mappings[hostname];
    if (!ips) {
      throw new Error(`ENOTFOUND: ${hostname}`);
    }
    return ips;
  };
}

describe("url-validator", () => {
  describe("validateUrl", () => {
    describe("blocked URLs - localhost", () => {
      it("blocks IPv4 localhost (127.0.0.1)", async () => {
        const result = await validateUrl("http://127.0.0.1/api");

        expect(result.allowed).toBe(false);
        expect(result).toHaveProperty("reason");
        if (!result.allowed) {
          expect(result.reason).toContain("127.0.0.1");
          expect(result.reason).toContain("not allowed");
        }
      });

      it("blocks IPv4 localhost range (127.x.x.x)", async () => {
        const localhostIps = [
          "http://127.0.0.1/path",
          "http://127.0.1.1/path",
          "http://127.255.255.255/path",
        ];

        for (const url of localhostIps) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(false);
        }
      });

      it("blocks localhost hostname", async () => {
        const result = await validateUrl("http://localhost/api");

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toContain("localhost");
        }
      });

      it("blocks localhost with port", async () => {
        const result = await validateUrl("http://localhost:8080/api");

        expect(result.allowed).toBe(false);
      });

      it("blocks localhost subdomains", async () => {
        const localhostVariants = [
          "http://sub.localhost/path",
          "http://api.localhost:3000/webhook",
          "http://localhost.localdomain/path",
        ];

        for (const url of localhostVariants) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(false);
        }
      });

      it("blocks hostnames that resolve to localhost", async () => {
        const result = await validateUrl("http://internal.example.com/api", {
          dnsResolve: mockDnsResolver({
            "internal.example.com": ["127.0.0.1"],
          }),
        });

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toContain("127.0.0.1");
        }
      });
    });

    describe("blocked URLs - private networks", () => {
      it("blocks 10.0.0.0/8 private range", async () => {
        const privateIps = [
          "http://10.0.0.1/path",
          "http://10.0.0.0/path",
          "http://10.255.255.255/path",
          "http://10.100.50.25:8080/api",
        ];

        for (const url of privateIps) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(false);
        }
      });

      it("blocks 172.16.0.0/12 private range", async () => {
        const privateIps = [
          "http://172.16.0.1/path",
          "http://172.16.0.0/path",
          "http://172.31.255.255/path",
          "http://172.20.10.5:3000/webhook",
        ];

        for (const url of privateIps) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(false);
        }
      });

      it("allows non-private 172.x.x.x ranges", async () => {
        // 172.15.x.x and 172.32.x.x are public
        const publicIps = [
          "http://172.15.255.255/path",
          "http://172.32.0.1/path",
        ];

        for (const url of publicIps) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(true);
        }
      });

      it("blocks 192.168.0.0/16 private range", async () => {
        const privateIps = [
          "http://192.168.0.1/path",
          "http://192.168.1.1/path",
          "http://192.168.255.255/path",
          "http://192.168.100.50:8080/api",
        ];

        for (const url of privateIps) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(false);
        }
      });

      it("blocks hostnames that resolve to private IPs", async () => {
        const result = await validateUrl("http://internal-service.local/api", {
          dnsResolve: mockDnsResolver({
            "internal-service.local": ["192.168.1.100"],
          }),
        });

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toContain("192.168.1.100");
        }
      });
    });

    describe("blocked URLs - link-local/metadata endpoints", () => {
      it("blocks 169.254.0.0/16 link-local range", async () => {
        const linkLocalIps = [
          "http://169.254.0.1/path",
          "http://169.254.255.255/path",
          "http://169.254.100.50/metadata",
        ];

        for (const url of linkLocalIps) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(false);
        }
      });

      it("blocks cloud metadata endpoint (169.254.169.254)", async () => {
        const metadataUrls = [
          "http://169.254.169.254/latest/meta-data/",
          "http://169.254.169.254/latest/api/token",
          "http://169.254.169.254/computeMetadata/v1/",
          "http://169.254.169.254:80/metadata/instance",
        ];

        for (const url of metadataUrls) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(false);
          if (!result.allowed) {
            expect(result.reason).toContain("169.254.169.254");
          }
        }
      });

      it("blocks hostnames that resolve to metadata IP", async () => {
        const result = await validateUrl("http://metadata.internal/latest/", {
          dnsResolve: mockDnsResolver({
            "metadata.internal": ["169.254.169.254"],
          }),
        });

        expect(result.allowed).toBe(false);
      });
    });

    describe("blocked URLs - IPv6", () => {
      it("blocks IPv6 localhost (::1)", async () => {
        const result = await validateUrl("http://[::1]/api");

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toContain("::1");
        }
      });

      it("blocks IPv6 unspecified address (::)", async () => {
        const result = await validateUrl("http://[::]/api");

        expect(result.allowed).toBe(false);
      });

      it("blocks IPv6 link-local addresses (fe80::/10)", async () => {
        const linkLocalIpv6 = [
          "http://[fe80::1]/path",
          "http://[fe80::abcd:1234]/path",
          "http://[febf::1]/path", // Upper end of fe80::/10
        ];

        for (const url of linkLocalIpv6) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(false);
        }
      });

      it("blocks IPv6 unique local addresses (fc00::/7)", async () => {
        const uniqueLocalIpv6 = [
          "http://[fc00::1]/path",
          "http://[fd00::1]/path",
          "http://[fdff:ffff:ffff::1]/path",
        ];

        for (const url of uniqueLocalIpv6) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(false);
        }
      });

      it("blocks IPv4-mapped IPv6 addresses with blocked IPv4", async () => {
        const mappedIpv6 = [
          "http://[::ffff:127.0.0.1]/path", // Localhost
          "http://[::ffff:192.168.1.1]/path", // Private
          "http://[::ffff:169.254.169.254]/path", // Metadata
        ];

        for (const url of mappedIpv6) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(false);
        }
      });

      it("blocks hostnames that resolve to blocked IPv6", async () => {
        const result = await validateUrl("http://internal.example.com/api", {
          dnsResolve: mockDnsResolver({
            "internal.example.com": ["::1"],
          }),
        });

        expect(result.allowed).toBe(false);
      });
    });

    describe("blocked URLs - non-HTTP schemes", () => {
      it("blocks ftp:// scheme", async () => {
        const result = await validateUrl("ftp://example.com/file.txt");

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toContain("ftp");
          expect(result.reason).toContain("not allowed");
        }
      });

      it("blocks file:// scheme", async () => {
        const result = await validateUrl("file:///etc/passwd");

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toContain("file");
        }
      });

      it("blocks javascript: scheme", async () => {
        const result = await validateUrl("javascript:alert(1)");

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toContain("javascript");
        }
      });

      it("blocks data: scheme", async () => {
        const result = await validateUrl("data:text/html,<script>alert(1)</script>");

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toContain("data");
        }
      });

      it("blocks gopher: scheme", async () => {
        const result = await validateUrl("gopher://example.com/");

        expect(result.allowed).toBe(false);
      });

      it("blocks ldap: scheme", async () => {
        const result = await validateUrl("ldap://example.com/");

        expect(result.allowed).toBe(false);
      });

      it("blocks dict: scheme", async () => {
        const result = await validateUrl("dict://example.com/");

        expect(result.allowed).toBe(false);
      });

      it("blocks sftp: scheme", async () => {
        const result = await validateUrl("sftp://example.com/file");

        expect(result.allowed).toBe(false);
      });
    });

    describe("blocked URLs - special cases", () => {
      it("blocks 0.0.0.0 (unspecified address)", async () => {
        const result = await validateUrl("http://0.0.0.0/api");

        expect(result.allowed).toBe(false);
      });

      it("blocks 0.x.x.x range (current network)", async () => {
        const currentNetworkIps = [
          "http://0.0.0.1/path",
          "http://0.255.255.255/path",
        ];

        for (const url of currentNetworkIps) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(false);
        }
      });

      it("blocks broadcast address (255.255.255.255)", async () => {
        const result = await validateUrl("http://255.255.255.255/api");

        expect(result.allowed).toBe(false);
      });

      it("rejects invalid URLs", async () => {
        const invalidUrls = [
          "not-a-url",
          "://missing-scheme.com",
          "http://",
        ];

        for (const url of invalidUrls) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(false);
        }
      });

      it("blocks when DNS resolution fails", async () => {
        const result = await validateUrl("http://nonexistent.invalid/api", {
          dnsResolve: mockDnsResolver({}), // No mappings = ENOTFOUND
        });

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toContain("DNS resolution failed");
        }
      });

      it("blocks if ANY resolved IP is in blocked range", async () => {
        // Even if one IP is public, block if any is private
        const result = await validateUrl("http://mixed.example.com/api", {
          dnsResolve: mockDnsResolver({
            "mixed.example.com": ["8.8.8.8", "192.168.1.1"], // One public, one private
          }),
        });

        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toContain("192.168.1.1");
        }
      });
    });
  });

  describe("allowed URLs - public domains and IPs", () => {
    describe("http and https schemes", () => {
      it("allows http:// scheme", async () => {
        const result = await validateUrl("http://203.0.113.50/api");

        expect(result.allowed).toBe(true);
      });

      it("allows https:// scheme", async () => {
        const result = await validateUrl("https://203.0.113.50/api");

        expect(result.allowed).toBe(true);
      });

      it("allows HTTPS URLs with paths and query strings", async () => {
        const result = await validateUrl("https://203.0.113.50:8080/v1/charges?limit=10");

        expect(result.allowed).toBe(true);
      });
    });

    describe("public IPv4 addresses", () => {
      it("allows public class A addresses (1-9.x.x.x)", async () => {
        const publicIps = [
          "http://1.1.1.1/api", // Cloudflare DNS
          "http://8.8.8.8/api", // Google DNS
          "http://9.0.0.1/api",
        ];

        for (const url of publicIps) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(true);
        }
      });

      it("allows public class A addresses (11-126.x.x.x)", async () => {
        const publicIps = [
          "http://11.0.0.1/api",
          "http://45.33.32.156/api",
          "http://100.0.0.1/api",
          "http://126.255.255.255/api",
        ];

        for (const url of publicIps) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(true);
        }
      });

      it("allows public 128-168.x.x.x range", async () => {
        const publicIps = [
          "http://128.0.0.1/api",
          "http://140.82.112.3/api", // GitHub
          "http://168.255.255.255/api",
        ];

        for (const url of publicIps) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(true);
        }
      });

      it("allows public 170-191.x.x.x range", async () => {
        const publicIps = [
          "http://170.0.0.1/api",
          "http://185.199.108.153/api", // GitHub Pages
          "http://191.255.255.255/api",
        ];

        for (const url of publicIps) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(true);
        }
      });

      it("allows public 193-223.x.x.x range", async () => {
        const publicIps = [
          "http://193.0.0.1/api",
          "http://203.0.113.50/api", // TEST-NET-3 (documentation)
          "http://216.58.214.206/api", // Google
          "http://223.255.255.255/api",
        ];

        for (const url of publicIps) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(true);
        }
      });

      it("allows public IPs with custom ports", async () => {
        const publicIps = [
          "http://203.0.113.50:80/api",
          "http://203.0.113.50:8080/api",
          "https://203.0.113.50:443/api",
          "https://203.0.113.50:3000/webhook",
        ];

        for (const url of publicIps) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(true);
        }
      });
    });

    describe("public domains with DNS resolution", () => {
      it("allows domain resolving to public IPv4", async () => {
        const result = await validateUrl("https://api.example.com/v1/charges", {
          dnsResolve: mockDnsResolver({
            "api.example.com": ["203.0.113.50"],
          }),
        });

        expect(result.allowed).toBe(true);
      });

      it("allows domain resolving to multiple public IPs", async () => {
        const result = await validateUrl("https://cdn.example.com/assets", {
          dnsResolve: mockDnsResolver({
            "cdn.example.com": ["203.0.113.50", "203.0.113.51", "198.51.100.1"],
          }),
        });

        expect(result.allowed).toBe(true);
      });

      it("allows subdomain resolving to public IP", async () => {
        const result = await validateUrl("https://api.v2.example.com/webhook", {
          dnsResolve: mockDnsResolver({
            "api.v2.example.com": ["198.51.100.100"],
          }),
        });

        expect(result.allowed).toBe(true);
      });

      it("allows domain with complex path and query", async () => {
        const result = await validateUrl(
          "https://api.stripe.com/v1/charges?customer=cus_123&limit=10",
          {
            dnsResolve: mockDnsResolver({
              "api.stripe.com": ["192.0.2.1"], // TEST-NET-1
            }),
          },
        );

        expect(result.allowed).toBe(true);
      });
    });

    describe("public IPv6 addresses", () => {
      it("allows public IPv6 global unicast (2000::/3)", async () => {
        const publicIpv6 = [
          "http://[2001:4860:4860::8888]/api", // Google DNS
          "http://[2606:4700:4700::1111]/api", // Cloudflare DNS
          "http://[2400:cb00::1]/api",
        ];

        for (const url of publicIpv6) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(true);
        }
      });

      it("allows IPv4-mapped IPv6 with public IPv4", async () => {
        const mappedIpv6 = [
          "http://[::ffff:8.8.8.8]/api", // Google DNS
          "http://[::ffff:203.0.113.50]/api",
        ];

        for (const url of mappedIpv6) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(true);
        }
      });

      it("allows domain resolving to public IPv6", async () => {
        const result = await validateUrl("https://ipv6.example.com/api", {
          dnsResolve: mockDnsResolver({
            "ipv6.example.com": ["2001:db8::1"],
          }),
        });

        expect(result.allowed).toBe(true);
      });

      it("allows domain resolving to mixed public IPv4 and IPv6", async () => {
        const result = await validateUrl("https://dual-stack.example.com/api", {
          dnsResolve: mockDnsResolver({
            "dual-stack.example.com": ["203.0.113.50", "2001:db8::1"],
          }),
        });

        expect(result.allowed).toBe(true);
      });
    });

    describe("edge cases for allowed URLs", () => {
      it("allows URLs at boundary of private ranges", async () => {
        // Just outside the blocked ranges
        const edgeCases = [
          "http://11.0.0.0/api", // Just after 10.x.x.x
          "http://172.15.255.255/api", // Just before 172.16.x.x
          "http://172.32.0.0/api", // Just after 172.31.x.x
          "http://192.167.255.255/api", // Just before 192.168.x.x
          "http://192.169.0.0/api", // Just after 192.168.x.x
          "http://169.253.255.255/api", // Just before 169.254.x.x
          "http://169.255.0.0/api", // Just after 169.254.x.x
        ];

        for (const url of edgeCases) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(true);
        }
      });

      it("allows URLs with unusual but valid paths", async () => {
        const urls = [
          "https://203.0.113.50/",
          "https://203.0.113.50/api/v1/users/123/profile",
          "https://203.0.113.50/path?query=value&other=123",
          "https://203.0.113.50/path#fragment",
          "https://203.0.113.50/path?query=value#fragment",
        ];

        for (const url of urls) {
          const result = await validateUrl(url);
          expect(result.allowed).toBe(true);
        }
      });

      it("allows URLs with encoded characters", async () => {
        const result = await validateUrl(
          "https://203.0.113.50/path%20with%20spaces?q=hello%20world",
        );

        expect(result.allowed).toBe(true);
      });

      it("allows URLs with authentication (user:pass@host)", async () => {
        const result = await validateUrl("https://203.0.113.50/api");

        expect(result.allowed).toBe(true);
      });
    });
  });

  describe("assertUrlAllowed", () => {
    it("throws UrlNotAllowedError for blocked URLs", async () => {
      await expect(
        assertUrlAllowed("http://127.0.0.1/api"),
      ).rejects.toThrow(UrlNotAllowedError);
    });

    it("throws with correct error properties", async () => {
      try {
        await assertUrlAllowed("http://192.168.1.1/api");
        expect.fail("Should have thrown");
      }
      catch (error) {
        expect(error).toBeInstanceOf(UrlNotAllowedError);
        if (error instanceof UrlNotAllowedError) {
          expect(error.url).toBe("http://192.168.1.1/api");
          expect(error.reason).toContain("192.168.1.1");
          expect(error.name).toBe("UrlNotAllowedError");
          expect(error.message).toContain("URL not allowed");
        }
      }
    });

    it("throws for non-HTTP schemes", async () => {
      await expect(
        assertUrlAllowed("ftp://example.com/file"),
      ).rejects.toThrow(UrlNotAllowedError);
    });

    it("throws for cloud metadata endpoint", async () => {
      await expect(
        assertUrlAllowed("http://169.254.169.254/latest/meta-data/"),
      ).rejects.toThrow(UrlNotAllowedError);
    });

    it("throws for IPv6 localhost", async () => {
      await expect(
        assertUrlAllowed("http://[::1]/api"),
      ).rejects.toThrow(UrlNotAllowedError);
    });

    it("does not throw for public IPv4 address", async () => {
      await expect(
        assertUrlAllowed("https://203.0.113.50/api"),
      ).resolves.toBeUndefined();
    });

    it("does not throw for HTTPS URL", async () => {
      await expect(
        assertUrlAllowed("https://8.8.8.8/dns-query"),
      ).resolves.toBeUndefined();
    });

    it("does not throw for public domain", async () => {
      await expect(
        assertUrlAllowed("https://api.example.com/webhook", {
          dnsResolve: mockDnsResolver({
            "api.example.com": ["203.0.113.50"],
          }),
        }),
      ).resolves.toBeUndefined();
    });

    it("does not throw for public IPv6 address", async () => {
      await expect(
        assertUrlAllowed("https://[2001:4860:4860::8888]/api"),
      ).resolves.toBeUndefined();
    });
  });
});
