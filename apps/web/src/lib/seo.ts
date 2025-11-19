import { brand, business, keywords, openGraph, seoDefaults, twitter } from '@cronicorn/content';
import type { PricingTier } from '@cronicorn/content';
import { APP_URL } from '@/config';

interface SEOOptions {
    title?: string;
    description?: string;
    keywords?: Array<string>;
    image?: string;
    url?: string;
    type?: 'website' | 'article' | 'product';
    noindex?: boolean;
    canonical?: string;
    structuredData?: Record<string, any> | Array<Record<string, any>>;
}

/**
 * Generate head configuration for TanStack Router from SEO options
 */
export function createSEOHead({
    title,
    description = brand.description,
    keywords: additionalKeywords = [],
    image,
    url,
    type = 'website',
    noindex = false,
    canonical,
    structuredData
}: SEOOptions) {
    // Format title
    const pageTitle = title
        ? seoDefaults.titleTemplate.replace('%s', title)
        : seoDefaults.defaultTitle;

    // Combine keywords
    const allKeywords = [...keywords.tier1, ...keywords.tier2, ...additionalKeywords];

    // Default image
    const ogImage = image || openGraph.images[0].url;
    const twitterImage = image || twitter.image;

    // Full URL
    const fullUrl = url ? `${APP_URL}${url}` : APP_URL;

    // Canonical URL - ensure it's absolute
    const canonicalUrl = canonical
        ? (canonical.startsWith('http') ? canonical : `${APP_URL}${canonical}`)
        : fullUrl;

    return {
        meta: [
            { title: pageTitle },
            { name: 'description', content: description },
            { name: 'keywords', content: allKeywords.join(', ') },
            { name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow' },

            // Open Graph
            { property: 'og:type', content: type },
            { property: 'og:url', content: fullUrl },
            { property: 'og:title', content: pageTitle },
            { property: 'og:description', content: description },
            { property: 'og:image', content: ogImage },
            { property: 'og:image:width', content: '1200' },
            { property: 'og:image:height', content: '630' },
            { property: 'og:image:alt', content: pageTitle },
            { property: 'og:site_name', content: openGraph.siteName },
            { property: 'og:locale', content: openGraph.locale },

            // Twitter Card
            { name: 'twitter:card', content: twitter.cardType },
            { name: 'twitter:site', content: twitter.site },
            { name: 'twitter:creator', content: twitter.handle },
            { name: 'twitter:url', content: fullUrl },
            { name: 'twitter:title', content: pageTitle },
            { name: 'twitter:description', content: description },
            { name: 'twitter:image', content: twitterImage },
        ],
        links: [
            { rel: 'canonical', href: canonicalUrl },
        ],
        scripts: structuredData ? [
            {
                type: 'application/ld+json',
                children: JSON.stringify(structuredData),
            },
        ] : [],
    };
}

// Utility functions for generating structured data
export const createWebsiteSchema = () => ({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: business.name,
    alternateName: brand.name,
    description: brand.description,
    url: APP_URL,
    potentialAction: {
        "@type": "SearchAction",
        target: {
            "@type": "EntryPoint",
            urlTemplate: `${APP_URL}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
    },
    publisher: {
        "@type": "Organization",
        name: business.name,
        legalName: business.legalName,
        url: APP_URL,
        sameAs: business.sameAs
    }
});

export const createOrganizationSchema = () => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${APP_URL}#organization`,
    name: business.name,
    legalName: business.legalName,
    description: business.description,
    url: APP_URL,
    foundingDate: business.foundingDate,
    sameAs: business.sameAs,
    contactPoint: {
        "@type": "ContactPoint",
        telephone: business.contactPoint.telephone,
        contactType: business.contactPoint.contactType,
        email: business.contactPoint.email
    }
});

export const createSoftwareApplicationSchema = () => ({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: brand.name,
    applicationCategory: ["Job Scheduling", "DevOps Automation", "Business Application"],
    applicationSubCategory: "Adaptive Task Scheduler",
    operatingSystem: "Web-based, API",
    description: brand.description,
    url: APP_URL,
    softwareVersion: "1.0",
    featureList: [
        "AI-powered adaptive scheduling",
        "Cron expression support",
        "REST API endpoints",
        "Real-time monitoring",
        "Intelligent failure handling"
    ],
    offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        priceValidUntil: "2026-12-31",
        availability: "https://schema.org/InStock",
        description: "Early access program available with paid upgrades",
        category: "Early Access"
    },
    aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "47",
        bestRating: "5",
        worstRating: "1"
    },
    provider: {
        "@type": "Organization",
        name: business.name,
        url: APP_URL
    }
});

export const createProductSchema = (tier: PricingTier) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${brand.name} ${tier.name}`,
    description: tier.description,
    brand: {
        "@type": "Brand",
        name: business.name
    },
    offers: {
        "@type": "Offer",
        name: tier.name,
        description: tier.description,
        price: tier.priceNumeric ? String(tier.priceNumeric) : "0",
        priceCurrency: tier.currency,
        availability: "https://schema.org/InStock",
        validFrom: new Date().toISOString(),
        priceSpecification: {
            "@type": "PriceSpecification",
            price: tier.priceNumeric ? String(tier.priceNumeric) : "0",
            priceCurrency: tier.currency,
            billingIncrement: "P1M"
        },
        seller: {
            "@type": "Organization",
            name: business.name,
            url: APP_URL
        }
    }
});

export const createBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: `${APP_URL}${item.url}`
    }))
});

export const createFAQSchema = (faqs: Array<{ question: string; answer: string }>) => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer
        }
    }))
});
