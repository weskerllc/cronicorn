import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { BarChart3, CheckCircle, Clock, Shield, Users, Zap } from "lucide-react";
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

      <main className="bg-background border" role="main">
        {/* Hero Section with Particle Animation Background */}
        <section className="relative min-h-screen bg-background overflow-hidden mb-8" aria-labelledby="hero-heading">
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
            <section className="px-6 py-16 bg-muted/30" aria-labelledby="how-it-works-heading">
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
            </section>

            {/* Zero-Click Optimization Section */}
            <section className="px-6 py-16" aria-labelledby="quick-answers-heading">
              <div className="max-w-6xl mx-auto">
                <header className="text-center mb-12">
                  <h2 id="quick-answers-heading" className="text-3xl font-bold mb-4">Quick Answers</h2>
                  <p className="text-lg text-muted-foreground">Everything you need to know about intelligent job scheduling</p>
                </header>

                <div className="grid md:grid-cols-2 gap-8">
                  {siteConfig.zeroClick.quickAnswers.map((qa, index) => (
                    <article key={index} className="bg-card p-6 rounded-lg border" itemScope itemType="https://schema.org/Question">
                      <header>
                        <h3 className="font-semibold text-lg mb-3" itemProp="name">{qa.question}</h3>
                      </header>
                      <div itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
                        <div itemProp="text" className="text-muted-foreground">
                          {qa.format === "steps" ? (
                            <ol className="list-decimal list-inside space-y-1">
                              {qa.answer.split('\n').map((step, i) => (
                                <li key={i}>{step.replace(/^\d+\.\s*/, '')}</li>
                              ))}
                            </ol>
                          ) : qa.format === "list" ? (
                            <ul className="list-disc list-inside space-y-1">
                              {qa.answer.split('\n').filter(line => line.startsWith('•')).map((item, i) => (
                                <li key={i}>{item.replace('•', '').trim()}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>{qa.answer}</p>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Key Statistics for Featured Snippets */}
                <aside className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6" aria-labelledby="key-stats-heading">
                  <h3 id="key-stats-heading" className="sr-only">Key Performance Statistics</h3>
                  {siteConfig.zeroClick.keyStats.map((stat, index) => (
                    <div key={index} className="text-center" itemScope itemType="https://schema.org/QuantitativeValue">
                      <div className="text-3xl font-bold text-primary" itemProp="value">{stat.value}</div>
                      <div className="text-sm text-muted-foreground" itemProp="name">{stat.metric}</div>
                      <div className="text-xs text-muted-foreground/70">{stat.context}</div>
                    </div>
                  ))}
                </aside>
              </div>
            </section>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto space-y-16 p-8" role="region" aria-label="Main content area">

              {session ? (
                /* Authenticated User Section */
                <section className="space-y-6" aria-labelledby="user-dashboard-heading">
                  <h2 id="user-dashboard-heading" className="sr-only">User Dashboard</h2>
                  <Card className="border-primary/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        👋 Hello, {session.user.name}!
                      </CardTitle>
                      <CardDescription>
                        Welcome back to your adaptive scheduling dashboard
                        <br />
                        <span className="text-sm text-muted-foreground">Email: {session.user.email}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4">
                      <Button asChild size="lg">
                        <Link to="/dashboard">
                          Go to Dashboard
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link to="/pricing">
                          View Pricing
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link to="/settings">
                          Account Settings
                        </Link>
                      </Button>
                      <Button variant="destructive" onClick={handleLogout}>
                        Logout
                      </Button>
                    </CardContent>
                  </Card>
                </section>
              ) : (
                /* Non-authenticated User Section */
                <>
                  <section className="space-y-6">
                    <Card className="border-primary/20">
                      <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Join the Future of Intelligent Scheduling</CardTitle>
                        <CardDescription className="text-lg">
                          Be part of our early access program and experience next-generation adaptive job scheduling
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-wrap justify-center gap-4">
                        <Button asChild size="lg">
                          <Link to="/register">
                            Join Early Access
                          </Link>
                        </Button>
                        <Button variant="outline" asChild size="lg">
                          <Link to="/login">
                            Login
                          </Link>
                        </Button>
                        <Button variant="secondary" asChild size="lg">
                          <Link to="/pricing">
                            View Pricing
                          </Link>
                        </Button>
                        <Button variant="ghost" asChild>
                          <a href={siteConfig.docsUrl} target="_blank" rel="noopener noreferrer">
                            Documentation
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  </section>

                  {/* Features Section */}
                  <section className="space-y-8" aria-labelledby="features-heading">
                    <header className="text-center space-y-4">
                      <h2 id="features-heading" className="text-3xl font-bold">Why Choose Cronicorn?</h2>
                      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Everything you need for intelligent job scheduling and automation
                      </p>
                    </header>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label="Platform features">
                      {features.map((feature, index) => (
                        <article key={index} className="hover:shadow-lg transition-shadow" role="listitem">
                          <Card>
                            <CardHeader>
                              <div className="flex items-center gap-3">
                                {feature.icon}
                                <CardTitle className="text-xl">{feature.title}</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <CardDescription className="text-base">
                                {feature.description}
                              </CardDescription>
                            </CardContent>
                          </Card>
                        </article>
                      ))}
                    </div>
                  </section>

                  {/* Benefits Section */}
                  <section className="bg-muted/30 rounded-lg p-8 space-y-6" aria-labelledby="benefits-heading">
                    <header className="text-center space-y-4">
                      <h2 id="benefits-heading" className="text-3xl font-bold">Transform Your Workflow</h2>
                      <p className="text-lg text-muted-foreground">
                        See the immediate impact on your development process
                      </p>
                    </header>
                    <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                      {benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                          <span className="text-lg">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Problems & Solutions Section - SEO Keywords */}
                  <section className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-8 space-y-8" aria-labelledby="problems-heading">
                    <header className="text-center space-y-4">
                      <h2 id="problems-heading" className="text-3xl font-bold">Stop Fighting Your Scheduler</h2>
                      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Traditional cron jobs create more problems than they solve. Here's how our adaptive task scheduler fixes them.
                      </p>
                    </header>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-red-600">Common DevOps Problems:</h3>
                        <ul className="space-y-3">
                          <li className="flex items-start gap-2">
                            <span className="text-red-500 font-bold mt-1">✗</span>
                            <span><strong>Alert fatigue:</strong> Getting paged at 3 AM for issues that fix themselves</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-500 font-bold mt-1">✗</span>
                            <span><strong>Unreliable cron jobs:</strong> Fixed intervals that ignore system reality</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-500 font-bold mt-1">✗</span>
                            <span><strong>Manual monitoring:</strong> Having to check microservices health manually</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-red-500 font-bold mt-1">✗</span>
                            <span><strong>No adaptation:</strong> Same monitoring frequency during calm and crisis</span>
                          </li>
                        </ul>
                      </div>
                      <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-green-600">Intelligent Cron Solutions:</h3>
                        <ul className="space-y-3">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                            <span><strong>Reduce alert fatigue:</strong> AI adapts frequency and attempts auto-recovery</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                            <span><strong>Event-driven scheduling:</strong> Responds to real-time system conditions</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                            <span><strong>Automate monitoring:</strong> Intelligent HTTP scheduler learns your patterns</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                            <span><strong>Context-aware:</strong> Tighten during incidents, relax during calm periods</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* FAQ Section for SEO */}
                  <section className="space-y-8" aria-labelledby="faq-heading">
                    <header className="text-center space-y-4">
                      <h2 id="faq-heading" className="text-3xl font-bold">Frequently Asked Questions</h2>
                      <p className="text-lg text-muted-foreground">
                        Get answers to common questions about Cronicorn
                      </p>
                    </header>
                    <div className="grid gap-6 max-w-4xl mx-auto" role="list" aria-label="Frequently asked questions">
                      {faqData.map((faq, index) => (
                        <article key={index} role="listitem" itemScope itemType="https://schema.org/Question">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-left" itemProp="name">{faq.question}</CardTitle>
                            </CardHeader>
                            <CardContent itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
                              <p className="text-muted-foreground" itemProp="text">
                                {faq.answer}
                              </p>
                            </CardContent>
                          </Card>
                        </article>
                      ))}
                    </div>
                  </section>

                  {/* Trust Indicators */}
                  <section className="text-center space-y-6" aria-labelledby="trust-heading">
                    <header className="space-y-4">
                      <h2 id="trust-heading" className="text-2xl font-bold">Trusted by Developers Worldwide</h2>
                    </header>
                    <div className="flex justify-center gap-8 text-sm text-muted-foreground" role="list" aria-label="Trust metrics">
                      <article className="flex flex-col items-center" role="listitem" itemScope itemType="https://schema.org/QuantitativeValue">
                        <span className="text-2xl font-bold text-primary" itemProp="value">{siteConfig.trustSignals.metrics.uptime}</span>
                        <span itemProp="name">Uptime SLA</span>
                      </article>
                      <article className="flex flex-col items-center" role="listitem" itemScope itemType="https://schema.org/QuantitativeValue">
                        <span className="text-2xl font-bold text-primary" itemProp="value">{siteConfig.trustSignals.metrics.jobsScheduledDaily}</span>
                        <span itemProp="name">Jobs Scheduled Daily</span>
                      </article>
                      <article className="flex flex-col items-center" role="listitem" itemScope itemType="https://schema.org/QuantitativeValue">
                        <span className="text-2xl font-bold text-primary" itemProp="value">{siteConfig.trustSignals.metrics.customersServed}</span>
                        <span itemProp="name">Active Teams</span>
                      </article>
                    </div>
                  </section>
                </>
              )}
            </div>

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
