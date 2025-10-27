import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { BarChart3, CheckCircle, Clock, Shield, Users, Zap } from "lucide-react";

import { signOut, useSession } from "@/lib/auth-client";
import { SEO, createOrganizationSchema, createSoftwareApplicationSchema, createWebsiteSchema } from "@/components/SEO";
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

  // Combined structured data for maximum SEO impact
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      createWebsiteSchema(),
      createOrganizationSchema(),
      createSoftwareApplicationSchema()
    ]
  };

  const features = [
    {
      icon: <Zap className="w-6 h-6 text-primary" />,
      title: "AI-Powered Scheduling",
      description: "Intelligent recommendations that optimize your job timing based on performance patterns and dependencies."
    },
    {
      icon: <Clock className="w-6 h-6 text-primary" />,
      title: "Smart Cron Management",
      description: "Advanced cron expression handling with natural language input and visual scheduling tools."
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-primary" />,
      title: "Advanced Analytics",
      description: "Deep insights into job performance, success rates, and resource utilization patterns."
    },
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      title: "Enterprise Security",
      description: "Bank-grade security with encryption, audit logs, and compliance-ready infrastructure."
    },
    {
      icon: <Users className="w-6 h-6 text-primary" />,
      title: "Team Collaboration",
      description: "Built-in collaboration tools with role-based access control and shared workspaces."
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-primary" />,
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
        description="Transform your cron jobs and scheduled tasks with Cronicorn's intelligent AI scheduling. Get smart recommendations, advanced analytics, and reliable job orchestration."
        keywords={["AI scheduling", "cron jobs", "job automation", "task scheduling", "webhook management"]}
        url="/"
        structuredData={structuredData}
      />

      <div className="max-w-6xl mx-auto space-y-16 p-8">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <div className="space-y-4">
            <Badge variant="secondary" className="mb-4">
              🚀 Now with AI-Powered Scheduling
            </Badge>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Welcome to {siteConfig.siteName}! 🦄
            </h1>
            <p className="text-2xl text-muted-foreground max-w-3xl mx-auto">
              {siteConfig.tagline}
            </p>
            <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
              Transform your cron jobs and scheduled tasks with intelligent AI scheduling.
              Get smart recommendations, advanced analytics, and enterprise-grade reliability.
            </p>
          </div>
        </section>

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
                </CardContent>
              </Card>
            </section>

            {/* Features Section */}
            <section className="space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold">Why Choose Cronicorn?</h2>
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
            <section className="bg-muted/30 rounded-lg p-8 space-y-6">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold">Transform Your Workflow</h2>
                <p className="text-lg text-muted-foreground">
                  See the immediate impact on your development process
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Trust Indicators */}
            <section className="text-center space-y-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Trusted by Developers Worldwide</h2>
                <div className="flex justify-center gap-8 text-sm text-muted-foreground">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-primary">99.9%</span>
                    <span>Uptime SLA</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-primary">10k+</span>
                    <span>Jobs Scheduled Daily</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-primary">500+</span>
                    <span>Active Teams</span>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
