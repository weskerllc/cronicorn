import { Helmet } from "@dr.pogodin/react-helmet";
import siteConfig from "@/site-config";

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: Array<string>;
    canonical?: string;
    ogType?: "website" | "article" | "product";
    ogImage?: string;
    noindex?: boolean;
    structuredData?: Record<string, any>;
}

export function SEO({
    title,
    description = siteConfig.description,
    keywords = [...siteConfig.keywords],
    canonical,
    ogType = "website",
    ogImage = siteConfig.ogImage,
    noindex = false,
    structuredData,
}: SEOProps) {
    // Construct full title
    const fullTitle = title
        ? `${title} | ${siteConfig.siteName}`
        : `${siteConfig.siteName} - ${siteConfig.tagline}`;

    // Construct canonical URL
    const canonicalUrl = canonical
        ? `${siteConfig.siteUrl}${canonical}`
        : siteConfig.siteUrl;

    // Construct full image URL
    const fullOgImage = ogImage.startsWith('http')
        ? ogImage
        : `${siteConfig.siteUrl}${ogImage}`;

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords.join(", ")} />

            {/* Canonical URL */}
            <link rel="canonical" href={canonicalUrl} />

            {/* Robots */}
            {noindex && <meta name="robots" content="noindex, nofollow" />}

            {/* Open Graph */}
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:type" content={ogType} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:site_name" content={siteConfig.siteName} />
            <meta property="og:image" content={fullOgImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:locale" content="en_US" />

            {/* Twitter Card */}
            <meta name="twitter:card" content={siteConfig.twitterCard} />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={fullOgImage} />
            <meta name="twitter:creator" content={siteConfig.twitter} />


            {/* Additional Meta Tags */}
            <meta name="author" content={siteConfig.author} />
            <meta name="theme-color" content="#6366f1" />
            <meta name="msapplication-TileColor" content="#6366f1" />

            {/* Structured Data */}
            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            )}
        </Helmet>
    );
}

// Utility function to generate organization structured data
export function createOrganizationStructuredData() {
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": siteConfig.siteName,
        "description": siteConfig.description,
        "url": siteConfig.siteUrl,
        "logo": `${siteConfig.siteUrl}${siteConfig.logo}`,
        "foundingDate": siteConfig.foundedYear,
        "sameAs": [
            siteConfig.githubUrl,
        ],
        "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer support",
            "url": siteConfig.supportUrl
        }
    };
}

// Utility function to generate website structured data
export function createWebsiteStructuredData() {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": siteConfig.siteName,
        "description": siteConfig.description,
        "url": siteConfig.siteUrl,
        "potentialAction": {
            "@type": "SearchAction",
            "target": `${siteConfig.siteUrl}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string"
        }
    };
}

// Utility function to generate software application structured data
export function createSoftwareApplicationStructuredData() {
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": siteConfig.siteName,
        "description": siteConfig.description,
        "url": siteConfig.siteUrl,
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "offers": siteConfig.pricingTiers.map(tier => ({
            "@type": "Offer",
            "name": tier.name,
            "price": tier.price,
            "priceCurrency": tier.currency,
            "priceSpecification": {
                "@type": "PriceSpecification",
                "price": tier.price,
                "priceCurrency": tier.currency,
                "billingDuration": `P1M` // Monthly billing
            }
        })),
        "creator": {
            "@type": "Organization",
            "name": siteConfig.company
        },
        "datePublished": siteConfig.foundedYear,
        "screenshot": `${siteConfig.siteUrl}${siteConfig.ogImage}`
    };
}

// Utility function to generate breadcrumb structured data
export function createBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": `${siteConfig.siteUrl}${item.url}`
        }))
    };
}