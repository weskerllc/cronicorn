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
      icon: <Zap className="w-6 h-6 text-primary" aria-label="AI-powered intelligent scheduling" />,
      title: "AI-Powered Scheduling",
      description: "Intelligent recommendations that optimize your job timing based on performance patterns and dependencies."
    },
    {
      icon: <Clock className="w-6 h-6 text-primary" aria-label="Smart cron job management" />,
      title: "Smart Cron Management",
      description: "Advanced cron expression handling with natural language input and visual scheduling tools."
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-primary" aria-label="Advanced analytics and insights" />,
      title: "Advanced Analytics",
      description: "Deep insights into job performance, success rates, and resource utilization patterns."
    },
    {
      icon: <Shield className="w-6 h-6 text-primary" aria-label="Enterprise security features" />,
      title: "Enterprise Security",
      description: "Bank-grade security with encryption, audit logs, and compliance-ready infrastructure."
    },
    {
      icon: <Users className="w-6 h-6 text-primary" aria-label="Team collaboration tools" />,
      title: "Team Collaboration",
      description: "Built-in collaboration tools with role-based access control and shared workspaces."
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-primary" aria-label="99.9% reliability guarantee" />,
      title: "99.9% Reliability",
      description: "Enterprise-grade uptime with automatic failover and distributed job execution."
    }
  ];

  const benefits = [
    "Reduce manual scheduling overhead by 90%",
    "Improve job success rates with AI optimization",
    "Scale from single tasks to enterprise workloads",
    "Integrate with existing tools and workflows"
  ];

  return (
    <>
      <SEO
        title="AI-Powered Job Scheduling Platform"
        description={siteConfig.metaDescriptions.home}
        keywords={[...siteConfig.seo.keywords]}
        url="/"
        canonical={siteConfig.url}
        structuredData={structuredData}
      />

      <main className="bg-background" role="main">
        {/* Hero Section with Particle Animation Background */}
        <section className="relative min-h-screen bg-background overflow-hidden mb-8" aria-labelledby="hero-heading">
          <BackgroundEffects />
          <HeroSection />
          <TimelineSection tabData={tabData} />
        </section>

        {/* What Cronicorn Does Section */}
        <section className="px-6">
          <WhatCronicornDoes />
        </section>

        {/* Zero-Click Optimization Section */}
        <section className="px-6 py-16 bg-muted/30" aria-labelledby="quick-answers-heading">
          <div className="max-w-6xl mx-auto">
            <header className="text-center mb-12">
              <h2 id="quick-answers-heading" className="text-3xl font-bold mb-4">Quick Answers</h2>
              <p className="text-lg text-muted-foreground">Everything you need to know about AI-powered job scheduling</p>
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
                    Welcome back to your AI-powered scheduling dashboard
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
                    <CardTitle className="text-2xl">Get Started with AI Scheduling</CardTitle>
                    <CardDescription className="text-lg">
                      Join thousands of developers who trust Cronicorn for intelligent job scheduling
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap justify-center gap-4">
                    <Button asChild size="lg">
                      <Link to="/register">
                        Start Free Trial
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
        <section className="relative w-full h-[60vh] md:h-[70vh] flex flex-col items-center overflow-hidden justify-center">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Loading particle animation...</div>}>
            <ParticleCanvas />
          </Suspense>
        </section>
      </main>
    </>
  );
}
