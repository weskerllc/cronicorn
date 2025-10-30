import { createFileRoute } from "@tanstack/react-router";
import AppLogo from "../icon.svg?react";
import BackgroundEffects from "../components/splash-page/components/background-effects";
import HeroSection from "../components/splash-page/components/hero-section";
import TimelineSection from "../components/splash-page/components/timeline-section";
import { monitoringScenarios } from "../components/splash-page/timeline/timeline-scenario-data";
import DynamicScheduleTimeline from "../components/splash-page/timeline/timeline";
import HeaderSection from "../components/splash-page/components/header-section";
import { Footer2 } from "../components/nav/footer";
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

        <div className="max-w-6xl px-2 md:px-4  mx-auto">
          <Footer2
            tagline={siteConfig.tagline}
            logoSlot={<a href={siteConfig.url} className="flex items-center space-x-2">
              <AppLogo className="size-12 fill-muted-foreground" aria-label="Cronicorn intelligent cron job scheduling platform logo" />
              <span className="font-medium text-2xl text-muted-foreground">{siteConfig.siteName}</span>
            </a>}
            menuItems={[
              {
                title: "Product",
                links: [
                  { text: "Home", url: siteConfig.urls.home },
                  { text: "Pricing", url: siteConfig.urls.pricing },
                  { text: "FAQ", url: siteConfig.urls.faq },
                  { text: "Dashboard", url: siteConfig.urls.dashboard },
                ],
              },
              {
                title: "Resources",
                links: [
                  { text: "Documentation", url: siteConfig.urls.documentation },
                  { text: "Quickstart Guide", url: siteConfig.urls.quickstart },
                  { text: "Use Cases", url: siteConfig.urls.useCases },
                  { text: "Architecture", url: siteConfig.urls.architecture },
                ],
              },
              {
                title: "Community",
                links: [
                  { text: "GitHub", url: siteConfig.urls.github },
                  { text: "Support", url: siteConfig.urls.support },
                  { text: "Contributing", url: siteConfig.urls.contributing },
                  { text: "Changelog", url: siteConfig.urls.changelog },
                ],
              },
              {
                title: "Legal",
                links: [
                  { text: "Privacy Policy", url: siteConfig.urls.privacy },
                  { text: "Terms of Service", url: siteConfig.urls.terms },
                  { text: "Contact", url: siteConfig.urls.contact },
                ],
              },
            ]}
            bottomLinks={[
              { text: "Privacy Policy", url: siteConfig.urls.privacy },
              { text: "Terms of Service", url: siteConfig.urls.terms },
            ]}
          />
        </div>

      </main>
    </>
  );
}
