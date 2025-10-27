import { Helmet } from 'react-helmet-async';
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

    // Full URL
    const fullUrl = url ? `${siteConfig.url}${url}` : siteConfig.url;

    // Canonical URL
    const canonicalUrl = canonical || fullUrl;

    return (
        <Helmet>
            {/* Primary Meta Tags */}
            <title>{pageTitle}</title>
            <meta name="title" content={pageTitle} />
            <meta name="description" content={description} />
            <meta name="keywords" content={allKeywords.join(', ')} />

            {/* Robots */}
            <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />

            {/* Canonical URL */}
            <link rel="canonical" href={canonicalUrl} />

            {/* Open Graph */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={fullUrl} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={pageTitle} />
            <meta property="og:site_name" content={siteConfig.seo.openGraph.siteName} />
            <meta property="og:locale" content={siteConfig.seo.openGraph.locale} />

            {/* Twitter Card */}
            <meta name="twitter:card" content={siteConfig.seo.twitter.cardType} />
            <meta name="twitter:site" content={siteConfig.seo.twitter.site} />
            <meta name="twitter:creator" content={siteConfig.seo.twitter.handle} />
            <meta name="twitter:url" content={fullUrl} />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={ogImage} />

            {/* Structured Data */}
            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            )}
        </Helmet>
    );
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
    description: siteConfig.description,
    url: siteConfig.url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: siteConfig.pricing.map(tier => ({
        "@type": "Offer",
        name: tier.name,
        description: tier.description,
        price: tier.priceNumeric ? String(tier.priceNumeric) : "0",
        priceCurrency: tier.currency,
        priceSpecification: {
            "@type": "PriceSpecification",
            price: tier.priceNumeric ? String(tier.priceNumeric) : "0",
            priceCurrency: tier.currency,
            billingIncrement: "P1M"
        }
    })),
    provider: {
        "@type": "Organization",
        name: siteConfig.business.name,
        url: siteConfig.url
    }
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