import { brand, faq, keywords, metaDescriptions, urls } from "@cronicorn/content";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import BackgroundEffects from "../components/splash-page/components/background-effects";
import HeaderSection from "../components/splash-page/components/header-section";
import HeroSection from "../components/splash-page/components/hero-section";
import TimelineSection from "../components/splash-page/components/timeline-section";
import LogoGrid from "../components/splash-page/components/logo-grid";
import DynamicScheduleTimeline from "../components/splash-page/timeline/timeline";
import { monitoringScenarios } from "../components/splash-page/timeline/timeline-scenario-data";
import AppLogo from "../logo.svg?react";
import { SEO, createFAQSchema, createOrganizationSchema, createSoftwareApplicationSchema, createWebsiteSchema } from "@/components/SEO";
import { FeatureCardsSection } from "@/components/composed/feature-cards-section";
import { Footer2 } from "@/components/nav/footer";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
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

      <main className="bg-background" role="main">
        {/* Hero Section with Particle Animation Background */}
        <section className="  relative min-h-screen bg-background overflow-hidden" aria-labelledby="hero-heading">
          <BackgroundEffects />
          <HeaderSection />

          <div className="relative w-full max-w-7xl mx-auto mt-14   px-4 md:px-8">

            <div className="grid grid-cols-1 items-start lg:grid-cols-2 gap-12 lg:gap-16 py-12 md:py-20 overflow-hidden">
              <HeroSection />
              <TimelineSection tabData={tabData} />
            </div>

            <FeatureCardsSection />

            <LogoGrid />

          </div>
        </section>

        <div className="w-full   px-4 md:px-8    border-t border-border/40  ">
          <Footer2
            tagline={brand.title}
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
                  { text: "Get Started", url: urls.product.dashboard },
                ],
              },
              {
                title: "Resources",
                links: [
                  { text: "Documentation", url: urls.docs.base },
                  { text: "Quickstart Guide", url: urls.docs.quickstart },
                  { text: "API Playground", url: urls.docs.apiReference },
                  { text: "MCP Server", url: urls.docs.mcpServer },
                  { text: "Use Cases", url: urls.docs.useCases },
                  { text: "Architecture", url: urls.docs.architecture },
                ],
              },
              {
                title: "Community",
                links: [
                  { text: "GitHub", url: urls.github.repo },
                  { text: "Discussions", url: urls.github.discussions },
                  { text: "Support", url: urls.github.issues },
                ],
              },
              {
                title: "Legal",
                links: [
                  { text: "Privacy Policy", url: urls.legal.privacy },
                  { text: "Terms of Service", url: urls.legal.terms },
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
