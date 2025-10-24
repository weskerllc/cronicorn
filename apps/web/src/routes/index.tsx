import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { Clock, Shield, TrendingUp, Zap } from "lucide-react";

import { signOut, useSession } from "@/lib/auth-client";
import { SEO, createOrganizationStructuredData, createSoftwareApplicationStructuredData, createWebsiteStructuredData } from "@/components/SEO";
import siteConfig from "@/site-config";

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

  // Combine structured data for the homepage
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      createOrganizationStructuredData(),
      createWebsiteStructuredData(),
      createSoftwareApplicationStructuredData()
    ]
  };

  return (
    <>
      <SEO
        title="AI-Powered Job Scheduling Platform"
        description="Transform your cron jobs and scheduled tasks with Cronicorn's intelligent AI scheduling. Get smart recommendations, advanced analytics, and reliable job orchestration for modern applications."
        keywords={[
          "AI job scheduling",
          "smart cron jobs",
          "automated task management",
          "job orchestration platform",
          "intelligent scheduling",
          "cron job management",
          "webhook automation",
          "task scheduling software"
        ]}
        canonical="/"
        structuredData={structuredData}
      />

      <div className="max-w-6xl mx-auto space-y-12 p-8">
        {/* Hero Section */}
        <header className="text-center space-y-6">
          <div className="space-y-4">
            <Badge variant="secondary" className="mb-4">
              🚀 Now in Beta - Free to Get Started
            </Badge>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Welcome to {siteConfig.siteName}! 🦄
            </h1>
            <p className="text-2xl text-muted-foreground max-w-3xl mx-auto">
              {siteConfig.tagline}
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-away">
              Harness the power of AI to optimize your scheduled tasks, automate job management,
              and get intelligent insights that keep your applications running smoothly.
            </p>
          </div>
        </header>

        {/* Features Section */}
        <section className="grid md:grid-cols-3 gap-8 my-16">
          <Card className="text-center">
            <CardHeader>
              <Zap className="h-12 w-12 mx-auto text-blue-500 mb-4" />
              <CardTitle>AI-Powered Optimization</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Our intelligent algorithms analyze your job patterns and automatically optimize
                scheduling for maximum efficiency and reliability.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Clock className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <CardTitle>Smart Scheduling</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Advanced cron management with predictive scheduling, load balancing,
                and automatic failure recovery to keep your jobs running 24/7.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="h-12 w-12 mx-auto text-purple-500 mb-4" />
              <CardTitle>Advanced Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Get deep insights into job performance, execution patterns, and system health
                with real-time monitoring and comprehensive reporting.
              </CardDescription>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        {session
          ? (
            <section className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hello, {session.user.name}! 👋</CardTitle>
                  <CardDescription>
                    Welcome back to your AI-powered scheduling platform.
                    Email: {session.user.email}
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
                      View Pricing Plans
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
          )
          : (
            <section className="space-y-6">
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardHeader className="text-center">
                  <Shield className="h-16 w-16 mx-auto text-blue-600 mb-4" />
                  <CardTitle className="text-2xl">Ready to Get Started?</CardTitle>
                  <CardDescription className="text-lg">
                    Join thousands of developers who trust {siteConfig.siteName} for their
                    mission-critical job scheduling needs. Sign up now and get started for free!
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap justify-center gap-4">
                  <Button asChild size="lg" className="font-semibold">
                    <Link to="/register">
                      Start Free Trial
                    </Link>
                  </Button>
                  <Button variant="outline" asChild size="lg">
                    <Link to="/login">
                      Sign In
                    </Link>
                  </Button>
                  <Button variant="secondary" asChild size="lg">
                    <Link to="/pricing">
                      View Pricing
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </section>
          )}

        {/* Trust Indicators */}
        <section className="text-center space-y-4 border-t pt-12">
          <h2 className="text-xl font-semibold text-muted-foreground">
            Trusted by developers worldwide for reliable job scheduling
          </h2>
          <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>99.9% Uptime SLA</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>24/7 Monitoring</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>AI-Powered</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
