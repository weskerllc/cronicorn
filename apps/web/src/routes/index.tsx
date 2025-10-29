import { createFileRoute } from "@tanstack/react-router";

import BackgroundEffects from "../components/splash-page/components/background-effects";
import HeroSection from "../components/splash-page/components/hero-section";
import TimelineSection from "../components/splash-page/components/timeline-section";
import { monitoringScenarios } from "../components/splash-page/timeline/timeline-scenario-data";
import DynamicScheduleTimeline from "../components/splash-page/timeline/timeline";
import HeaderSection from "../components/splash-page/components/header-section";
import QuickAnswersSection from "@/components/sections/quick-answers-section";
import CTASection from "@/components/sections/cta-section";
import { SEO, createFAQSchema, createOrganizationSchema, createSoftwareApplicationSchema, createWebsiteSchema } from "@/components/SEO";
import siteConfig from "@/site-config";

export const Route = createFileRoute("/")({
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

  // FAQ data from site config for both display and structured data
  const faqData = [...siteConfig.faq.primary];

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
        title="Adaptive Job Scheduling Platform"
        description={siteConfig.metaDescriptions.home}
        keywords={[...siteConfig.seo.keywords]}
        url="/"
        canonical={siteConfig.url}
        structuredData={structuredData}
      />

      <main className="bg-background" role="main">
        {/* Hero Section with Particle Animation Background */}
        <section className="relative min-h-screen bg-background overflow-hidden mb-8 p-2 md:p-4" aria-labelledby="hero-heading">
          <BackgroundEffects />
          <HeaderSection />


          <div className="border relative border-muted-foreground/10 w-full max-w-6xl mx-auto mt-28">
            <HeroSection />
            <TimelineSection tabData={tabData} />

            <QuickAnswersSection />

            <CTASection />
          </div>
        </section>

      </main>
    </>
  );
}
