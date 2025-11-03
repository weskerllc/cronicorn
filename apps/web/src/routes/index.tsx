import { createFileRoute } from "@tanstack/react-router";
import { brand, faq, keywords, metaDescriptions, urls } from "@cronicorn/content";
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
            tagline={brand.tagline}
            logoSlot={<a href={urls.product.home} className="flex items-center space-x-2">
              <AppLogo className="size-12 fill-muted-foreground" aria-label="Cronicorn intelligent cron job scheduling platform logo" />
              <span className="font-medium text-2xl text-muted-foreground">{brand.name}</span>
            </a>}
            menuItems={[
              {
                title: "Product",
                links: [
                  { text: "Home", url: urls.product.home },
                  { text: "Pricing", url: urls.product.pricing },
                  { text: "FAQ", url: urls.product.faq },
                  { text: "Dashboard", url: urls.product.dashboard },
                ],
              },
              {
                title: "Resources",
                links: [
                  { text: "Documentation", url: urls.docs.base },
                  { text: "Quickstart Guide", url: urls.docs.quickstart },
                  { text: "Use Cases", url: urls.docs.useCases },
                  { text: "Architecture", url: urls.docs.architecture },
                ],
              },
              {
                title: "Community",
                links: [
                  { text: "GitHub", url: urls.github.repo },
                  { text: "Support", url: urls.github.issues },
                  { text: "Contributing", url: urls.github.contributing },
                  { text: "Changelog", url: urls.github.changelog },
                ],
              },
              {
                title: "Legal",
                links: [
                  { text: "Privacy Policy", url: urls.legal.privacy },
                  { text: "Terms of Service", url: urls.legal.terms },
                  { text: "Contact", url: urls.legal.contact },
                ],
              },
            ]}
            bottomLinks={[
              { text: "Privacy Policy", url: urls.legal.privacy },
              { text: "Terms of Service", url: urls.legal.terms },
            ]}
          />
        </div>

      </main>
    </>
  );
}
