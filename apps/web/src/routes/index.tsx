import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { ArrowRight, BarChart3, CheckCircle, ChevronRight, Clock, Shield, Users, Zap } from "lucide-react";
import { Suspense, lazy } from "react";

import BackgroundEffects from "../components/splash-page/components/background-effects";
import HeroSection from "../components/splash-page/components/hero-section";
import TimelineSection from "../components/splash-page/components/timeline-section";
import WhatCronicornDoes from "../components/splash-page/what-cronicorn-does/what-cronicorn-does";
import { monitoringScenarios } from "../components/splash-page/timeline/timeline-scenario-data";
import DynamicScheduleTimeline from "../components/splash-page/timeline/timeline";
import HeaderSection from "../components/splash-page/components/header-section";
import { signOut, useSession } from "@/lib/auth-client";
import { SEO, createFAQSchema, createOrganizationSchema, createSoftwareApplicationSchema, createWebsiteSchema } from "@/components/SEO";
import siteConfig from "@/site-config";

// Lazy load heavy components for better performance
const ParticleCanvas = lazy(() => import("../components/splash-page/components/particle-canvas"));

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/login";
        },
      },
    });
  };

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

  const features = [
    {
      icon: <Zap className="w-6 h-6 text-primary" aria-label="Adaptive intervals that adjust to real-time conditions" />,
      title: "Adaptive Intervals",
      description: "Automatically adjust monitoring frequency based on real-time conditions. Example: 'Traffic surge detected—tightening monitoring to 30 seconds' then relaxing back to 5 minutes during recovery."
    },
    {
      icon: <Clock className="w-6 h-6 text-primary" aria-label="Multi-tier workflow coordination" />,
      title: "Multi-Tier Coordination",
      description: "Orchestrate intelligent workflows across Health, Investigation, Recovery, and Alert tiers with conditional endpoint activation."
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-primary" aria-label="AI hints system for intelligent adaptation" />,
      title: "AI Hints System",
      description: "Intelligent 'hints' that temporarily adjust baseline schedules based on system load, traffic patterns, and external factors with TTL."
    },
    {
      icon: <Shield className="w-6 h-6 text-primary" aria-label="Transparent AI decision making" />,
      title: "Transparent AI Decisions",
      description: "Every AI adjustment includes clear reasoning. Example: 'Frequency increased due to error rate spike (2.1% → 5.3%)' No black boxes—you always know why."
    },
    {
      icon: <Users className="w-6 h-6 text-primary" aria-label="Diverse use case support" />,
      title: "Diverse Use Cases",
      description: "From e-commerce flash sale monitoring to data pipeline coordination—handle any API-dependent workflow with intelligent adaptation."
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-primary" aria-label="Cloud-native architecture" />,
      title: "Cloud-Native Platform",
      description: "Fully managed cloud service with enterprise security. No installation, no infrastructure maintenance—focus on your business logic."
    }
  ];

  const benefits = [
    "Join early access program for next-generation scheduling",
    "Handle diverse use cases beyond traditional DevOps automation",
    "Use AI hints system for real-time schedule adaptation",
    "Access cloud-native platform without installation or maintenance"
  ];

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


          {/* What Cronicorn Does Section */}
          {/* <section className="px-6">
          <WhatCronicornDoes />
        </section> */}


          <div className="border relative border-muted-foreground/10 w-full max-w-6xl mx-auto mt-28">
            <HeroSection />
            <TimelineSection tabData={tabData} />

            {/* How It Works - Intelligent Scheduling Process */}
            {/* <section className="px-6 py-16 bg-muted/30" aria-labelledby="how-it-works-heading">
              <div className="max-w-6xl mx-auto">
                <header className="text-center mb-12">
                  <h2 id="how-it-works-heading" className="text-3xl font-bold mb-4">{siteConfig.productCapabilities.howItWorks.title}</h2>
                  <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    Clear explanation of how Cronicorn transforms static scheduling into intelligent, adaptive automation.
                  </p>
                </header>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {siteConfig.productCapabilities.howItWorks.steps.map((step, index) => (
                    <article key={index} className="text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-primary font-bold text-lg">{step.number}</span>
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                      <p className="text-muted-foreground text-sm mb-4">{step.description}</p>
                      <details className="text-left">
                        <summary className="cursor-pointer text-xs text-primary hover:underline">View Details</summary>
                        <p className="text-xs text-muted-foreground mt-2 px-4 py-2 bg-accent/30 rounded">{step.details}</p>
                      </details>
                    </article>
                  ))}
                </div>

                <div className="text-center mt-12">
                  <div className="inline-flex items-center gap-6 p-6 bg-card rounded-lg border">
                    <div className="text-2xl">🔄</div>
                    <div className="text-left">
                      <h3 className="font-semibold">Workflow Example</h3>
                      <p className="text-sm text-muted-foreground">Health → Investigation → Recovery → Alert</p>
                      <p className="text-xs text-muted-foreground mt-1">Only page humans when automated recovery fails</p>
                    </div>
                  </div>
                </div>
              </div>
            </section> */}

            {/* Zero-Click Optimization Section */}
            <section className="pt-16 md:pt-20" aria-labelledby="quick-answers-heading">
              <div className="max-w-5xl mx-auto">
                <header className="text-center mb-12 md:mb-16">
                  <h2 id="quick-answers-heading" className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">Quick Answers</h2>
                  <p className="text-base md:text-lg text-muted-foreground/80">Everything you need to know about intelligent job scheduling</p>
                </header>

                <div className="grid md:grid-cols-2">
                  {siteConfig.zeroClick.quickAnswers.map((qa, index) => (
                    <article key={index} className=" p-6 md:p-8 border border-border/40 hover:border-border/70 hover:shadow-sm transition-all duration-200" itemScope itemType="https://schema.org/Question">
                      <header>
                        <h3 className="font-semibold text-lg md:text-xl mb-3 tracking-tight" itemProp="name">{qa.question}</h3>
                      </header>
                      <div itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
                        <div itemProp="text" className="text-muted-foreground/90 text-sm md:text-base leading-relaxed">
                          {qa.format === "steps" ? (
                            <ol className="list-decimal list-inside space-y-1.5">
                              {qa.answer.split('\n').map((step, i) => (
                                <li key={i} className="leading-relaxed">{step.replace(/^\d+\.\s*/, '')}</li>
                              ))}
                            </ol>
                          ) : qa.format === "list" ? (
                            <ul className="list-disc list-inside space-y-1.5">
                              {qa.answer.split('\n').filter(line => line.startsWith('•')).map((item, i) => (
                                <li key={i} className="leading-relaxed">{item.replace('•', '').trim()}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="leading-relaxed">{qa.answer}</p>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Key Statistics for Featured Snippets */}
                {/* <aside className="mt-16 md:mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 py-12 md:py-14 bg-muted/20 rounded-xl px-6" aria-labelledby="key-stats-heading">
                  <h3 id="key-stats-heading" className="sr-only">Key Performance Statistics</h3>
                  {siteConfig.zeroClick.keyStats.map((stat, index) => (
                    <div key={index} className="text-center" itemScope itemType="https://schema.org/QuantitativeValue">
                      <div className="text-3xl md:text-4xl font-bold text-foreground mb-1.5" itemProp="value">{stat.value}</div>
                      <div className="text-xs md:text-sm font-medium text-foreground/80 mb-0.5" itemProp="name">{stat.metric}</div>
                      <div className="text-xs text-muted-foreground/70">{stat.context}</div>
                    </div>
                  ))}
                </aside> */}
              </div>
            </section>

            {/* Main Content */}

            <section className="relative w-full flex  items-center justify-center px-6 py-16 md:py-20 overflow-hidden border-b border-border/40">
              <div className="text-center max-w-4xl relative z-10 flex flex-col md:items-center md:flex-row md:gap-12">
                <a
                  href="/login"
                  className="group px-12 py-6 bg-primary text-primary-foreground rounded-lg font-medium text-lg hover:bg-primary/90 transition-all duration-150 shadow-sm hover:shadow-md flex items-center gap-2"
                >
                  Join Early Access
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
                </a>

                <div className="flex flex-col">
                  <Button variant={'outline'}> View us on Github
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>



                </div>
              </div>
            </section>



            {/* Particles Canvas Section - Bottom */}
            {/* <section className="relative w-full h-[60vh] md:h-[70vh] flex flex-col items-center overflow-hidden justify-center">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Loading particle animation...</div>}>
            <ParticleCanvas />
          </Suspense>
        </section> */}
          </div>
        </section>

      </main>
    </>
  );
}
