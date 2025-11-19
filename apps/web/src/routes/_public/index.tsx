import { faq, keywords, metaDescriptions, urls } from "@cronicorn/content";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import HeroSection from "../../components/splash-page/components/hero-section";
import LogoGrid from "../../components/splash-page/components/logo-grid";
import TimelineSection from "../../components/splash-page/components/timeline-section";
import DynamicScheduleTimeline from "../../components/splash-page/timeline/timeline";
import { monitoringScenarios } from "../../components/splash-page/timeline/timeline-scenario-data";
import { useAuth } from "@/lib/auth-context";
import { FeatureCardsSection } from "@/components/composed/feature-cards-section";
import { SEO, createFAQSchema, createOrganizationSchema, createSoftwareApplicationSchema, createWebsiteSchema } from "@/components/SEO";

export const Route = createFileRoute("/_public/")({
  component: Index,
});

function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate({ to: '/dashboard' });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Timeline data from splash page
  const tabData = monitoringScenarios.map(scenario => ({
    id: scenario.id,
    label: scenario.name,
    content: <DynamicScheduleTimeline scenario={scenario} />,
    icon: <div className="w-2 h-2 rounded-full bg-current opacity-60" />,
  }));

  // FAQ data from site config for both display and structured data
  const faqData = [...faq];

  // Combined structured data for maximum SEO impact
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      createWebsiteSchema(),
      createOrganizationSchema(),
      createSoftwareApplicationSchema(),
      createFAQSchema(faqData)
    ]
  };

  return (
    <>
      <SEO
        description={metaDescriptions.home}
        keywords={[...keywords.tier1, ...keywords.tier2]}
        url="/"
        canonical={urls.product.home}
        structuredData={structuredData}
      />

      <div className="grid grid-cols-1 items-start lg:grid-cols-2 gap-12 lg:gap-16 py-12 md:py-20 overflow-hidden">
        <HeroSection />
        <TimelineSection tabData={tabData} />
      </div>

      <FeatureCardsSection />

      <LogoGrid />
    </>
  );
}
