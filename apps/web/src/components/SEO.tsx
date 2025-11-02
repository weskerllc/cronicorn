import { useHead } from '@unhead/react';
import siteConfig from '../site-config';

interface SEOProps {
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

export function SEO({
    title,
    description = siteConfig.description,
    keywords = [],
    image,
    url,
    type = 'website',
    noindex = false,
    canonical,
    structuredData
}: SEOProps) {
    // Format title
    const pageTitle = title
        ? siteConfig.seo.titleTemplate.replace('%s', title)
        : siteConfig.seo.defaultTitle;

    // Combine keywords
    const allKeywords = [...siteConfig.seo.keywords, ...keywords];

    // Default image
    const ogImage = image || siteConfig.seo.openGraph.images[0].url;

    // Twitter-specific image (separate from OG image)
    const twitterImage = image || siteConfig.seo.twitter.image;

    // Full URL
    const fullUrl = url ? `${siteConfig.url}${url}` : siteConfig.url;

    // Canonical URL
    const canonicalUrl = canonical || fullUrl;

    // Use Unhead to inject meta tags
    useHead({
        title: pageTitle,
        meta: [
            { name: 'title', content: pageTitle },
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
            { property: 'og:site_name', content: siteConfig.seo.openGraph.siteName },
            { property: 'og:locale', content: siteConfig.seo.openGraph.locale },

            // Twitter Card
            { name: 'twitter:card', content: siteConfig.seo.twitter.cardType },
            { name: 'twitter:site', content: siteConfig.seo.twitter.site },
            { name: 'twitter:creator', content: siteConfig.seo.twitter.handle },
            { name: 'twitter:url', content: fullUrl },
            { name: 'twitter:title', content: pageTitle },
            { name: 'twitter:description', content: description },
            { name: 'twitter:image', content: twitterImage },
        ],
        link: [
            { rel: 'canonical', href: canonicalUrl },
        ],
        script: structuredData ? [
            {
                type: 'application/ld+json',
                innerHTML: JSON.stringify(structuredData),
            },
        ] : [],
    });

    return null;
}

// Utility functions for generating structured data
export const createWebsiteSchema = () => ({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.business.name,
    alternateName: siteConfig.siteName,
    description: siteConfig.description,
    url: siteConfig.url,
    potentialAction: {
        "@type": "SearchAction",
        target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteConfig.url}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
    },
    publisher: {
        "@type": "Organization",
        name: siteConfig.business.name,
        legalName: siteConfig.business.legalName,
        url: siteConfig.url,
        sameAs: siteConfig.business.sameAs
    }
});

export const createOrganizationSchema = () => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}#organization`,
    name: siteConfig.business.name,
    legalName: siteConfig.business.legalName,
    description: siteConfig.business.description,
    url: siteConfig.url,
    foundingDate: siteConfig.business.foundingDate,
    sameAs: siteConfig.business.sameAs,
    contactPoint: {
        "@type": "ContactPoint",
        telephone: siteConfig.business.contactPoint.telephone,
        contactType: siteConfig.business.contactPoint.contactType,
        email: siteConfig.business.contactPoint.email
    }
});

export const createSoftwareApplicationSchema = () => ({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.siteName,
    applicationCategory: ["Job Scheduling", "DevOps Automation", "Business Application"],
    applicationSubCategory: "Adaptive Task Scheduler",
    operatingSystem: "Web-based, API",
    description: siteConfig.description,
    url: siteConfig.url,
    softwareVersion: "1.0",
    releaseNotes: "Early access version with adaptive scheduling capabilities",
    featureList: [
        "Adaptive Intervals",
        "Multi-Tier Coordination",
        "AI Hints System",
        "Transparent AI Decisions",
        "Cloud-Native Architecture",
        "Real-Time Adaptation",
        "Workflow Orchestration",
        "Auto-Recovery",
        "Intelligent Monitoring",
        "Event-Driven Scheduling"
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
        name: siteConfig.business.name,
        url: siteConfig.url
    },
    creator: {
        "@type": "Organization",
        name: siteConfig.business.name,
        url: siteConfig.url
    },
    downloadUrl: siteConfig.url,
    installUrl: `${siteConfig.url}/login`,
    screenshot: `${siteConfig.url}/og-image.png`,
    video: `${siteConfig.url}/demo.mp4`
});

export const createProductSchema = (tier: (typeof siteConfig.pricing)[number]) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${siteConfig.siteName} ${tier.name}`,
    description: tier.description,
    brand: {
        "@type": "Brand",
        name: siteConfig.business.name
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
            name: siteConfig.business.name,
            url: siteConfig.url
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
        item: `${siteConfig.url}${item.url}`
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

export default SEO;