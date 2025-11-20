import { faq, keywords, metaDescriptions, urls } from "@cronicorn/content";
import { createFileRoute } from "@tanstack/react-router";
import HeroSection from "../../components/splash-page/components/hero-section";
import LogoGrid from "../../components/splash-page/components/logo-grid";
import TimelineSection from "../../components/splash-page/components/timeline-section";
import DynamicScheduleTimeline from "../../components/splash-page/timeline/timeline";
import { monitoringScenarios } from "../../components/splash-page/timeline/timeline-scenario-data";
import { FeatureCardsSection } from "@/components/composed/feature-cards-section";
import { createFAQSchema, createOrganizationSchema, createSEOHead, createSoftwareApplicationSchema, createWebsiteSchema } from "@/lib/seo";

export const Route = createFileRoute("/_public/")({
  head: () => {
    // Combined structured data for maximum SEO impact
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        createWebsiteSchema(),
        createOrganizationSchema(),
        createSoftwareApplicationSchema(),
        createFAQSchema(faq)
      ]
    };

    return createSEOHead({
      description: metaDescriptions.home,
      keywords: [...keywords.tier1, ...keywords.tier2],
      url: "/",
      canonical: urls.product.home,
      structuredData,
    });
  },
  component: Index,
});

function Index() {

  // Timeline data from splash page
  const tabData = monitoringScenarios.map(scenario => ({
    id: scenario.id,
    label: scenario.name,
    content: <DynamicScheduleTimeline scenario={scenario} />,
    icon: <div className="w-2 h-2 rounded-full bg-current opacity-60" />,
  }));

  return (
    <>
      <div className="grid grid-cols-1 items-start lg:grid-cols-2 gap-12 lg:gap-16 py-12 md:py-20 overflow-hidden">
        <HeroSection />
        <TimelineSection tabData={tabData} />
      </div>

      <FeatureCardsSection />

      <LogoGrid />
    </>
  );
}
