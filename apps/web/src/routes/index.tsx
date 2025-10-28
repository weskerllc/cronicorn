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

      <main className="bg-background">
        {/* Hero Section with Particle Animation Background */}
        <section className="relative min-h-screen bg-background overflow-hidden mb-8">
          <BackgroundEffects />
          <HeroSection />
          <TimelineSection tabData={tabData} />
        </section>

        {/* What Cronicorn Does Section */}
        <section className="px-6">
          <WhatCronicornDoes />
        </section>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto space-y-16 p-8">

          {session ? (
            /* Authenticated User Section */
            <section className="space-y-6">
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
                <div className="text-center space-y-4">
                  <h2 id="features-heading" className="text-3xl font-bold">Why Choose Cronicorn?</h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Everything you need for intelligent job scheduling and automation
                  </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {features.map((feature, index) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
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
                  ))}
                </div>
              </section>

              {/* Benefits Section */}
              <section className="bg-muted/30 rounded-lg p-8 space-y-6" aria-labelledby="benefits-heading">
                <div className="text-center space-y-4">
                  <h2 id="benefits-heading" className="text-3xl font-bold">Transform Your Workflow</h2>
                  <p className="text-lg text-muted-foreground">
                    See the immediate impact on your development process
                  </p>
                </div>
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
                <div className="text-center space-y-4">
                  <h2 id="faq-heading" className="text-3xl font-bold">Frequently Asked Questions</h2>
                  <p className="text-lg text-muted-foreground">
                    Get answers to common questions about Cronicorn
                  </p>
                </div>
                <div className="grid gap-6 max-w-4xl mx-auto">
                  {faqData.map((faq, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-left">{faq.question}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          {faq.answer}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Trust Indicators */}
              <section className="text-center space-y-6" aria-labelledby="trust-heading">
                <div className="space-y-4">
                  <h2 id="trust-heading" className="text-2xl font-bold">Trusted by Developers Worldwide</h2>
                  <div className="flex justify-center gap-8 text-sm text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-primary">{siteConfig.trustSignals.metrics.uptime}</span>
                      <span>Uptime SLA</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-primary">{siteConfig.trustSignals.metrics.jobsScheduledDaily}</span>
                      <span>Jobs Scheduled Daily</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-primary">{siteConfig.trustSignals.metrics.customersServed}</span>
                      <span>Active Teams</span>
                    </div>
                  </div>
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
