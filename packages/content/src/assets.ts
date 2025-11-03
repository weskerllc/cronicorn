/**
 * Brand assets and favicon configuration
 * Centralized source for logo and favicon across all apps
 */

export const logo = {
    /**
     * Path to the SVG logo (relative to public/static directory in each app)
     * Used for inline rendering in UI components
     */
    svg: "/logo.svg",

    /**
     * Alt text for the logo
     */
    alt: "Cronicorn intelligent cron job scheduling platform logo",

    /**
     * Recommended display sizes
     */
    sizes: "32x32",
} as const;

export const favicon = {
    /**
     * Path to SVG favicon (modern browsers)
     * Same as logo.svg, optimized for small sizes
     */
    svg: "/logo.svg",

    /**
     * Path to ICO favicon (fallback for older browsers)
     */
    ico: "/favicon.ico",

    /**
     * Standard favicon sizes
     */
    sizes: "32x32",

    /**
     * MIME type for SVG favicon
     */
    type: "image/svg+xml",
} as const;

/**
 * Asset file names for build-time copying
 * These are the actual file names in packages/content/assets/
 */
export const assetFiles = {
    logo: "logo.svg",
    favicon: "favicon.ico",
} as const;
