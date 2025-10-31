import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Input } from "@cronicorn/ui-library/components/input";
import { Label } from "@cronicorn/ui-library/components/label";
import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { AlertCircle, CheckCircle } from "lucide-react";

import { signUp } from "@/lib/auth-client";
import { SEO } from "@/components/SEO";
import siteConfig from "@/site-config";

export const Route = createFileRoute("/register")({
  component: RouteComponent,
});

function RouteComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    await signUp.email(
      { email, password, name },
      {
        onSuccess: () => {
          navigate({ to: "/dashboard" });
        },
        onError: (ctx) => {
          setError((ctx as any)?.message || "Failed to create account. Please try again.");
          setIsLoading(false);
        },
      },
    );
  };

  // Structured data for registration page
  const registerStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Create Account - Cronicorn",
    description: "Join thousands of developers using Cronicorn for intelligent AI-powered job scheduling and automation",
    url: `${siteConfig.url}/register`,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.siteName,
      url: siteConfig.url
    },
    potentialAction: {
      "@type": "RegisterAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/register`,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform"
        ]
      },
      object: {
        "@type": "DigitalDocument",
        name: "User Account",
        description: "Free account for Cronicorn AI scheduling platform"
      },
      result: {
        "@type": "MembershipAccount",
        name: "Cronicorn Account",
        description: "Access to AI-powered job scheduling tools"
      }
    }
  };

  const benefits = [
    "Start with 100 free jobs per month",
    "AI-powered scheduling recommendations",
    "Advanced analytics and monitoring",
    "Email notifications and alerts"
  ];

  return (
    <>
      <SEO
        title={siteConfig.pageTitles.register}
        description={siteConfig.metaDescriptions.register}
        keywords={["sign up", "create account", "register", "free trial", "AI scheduling", "join"]}
        url="/register"
        noindex={true}
        structuredData={registerStructuredData}
      />

      <main className="flex min-h-screen items-center justify-center p-4" role="main">
        <div className="w-full max-w-2xl">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Benefits Section */}
            <div className="space-y-6 order-2 lg:order-1">
              <div className="space-y-4">
                <Badge variant="secondary" className="inline-flex">
                  🚀 Free to Start
                </Badge>
                <h1 className="text-3xl font-bold">
                  Join {siteConfig.siteName}
                </h1>
                <p className="text-lg text-muted-foreground">
                  Start scheduling with AI intelligence today
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="font-semibold text-lg">What you get:</h2>
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="text-sm text-muted-foreground">
                <p>No credit card required • Cancel anytime • Upgrade when ready</p>
              </div>
            </div>

            {/* Registration Form */}
            <Card className="w-full order-1 lg:order-2">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">Create Account</CardTitle>
                <CardDescription className="text-center">
                  Get started with your free {siteConfig.siteName} account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4" role="alert">
                    <AlertCircle className="size-4" aria-hidden="true" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      disabled={isLoading}
                      required
                      autoComplete="name"
                      aria-describedby="name-error"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      autoComplete="email"
                      aria-describedby="email-error"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      autoComplete="new-password"
                      aria-describedby="password-help password-error"
                    />
                    <p id="password-help" className="text-xs text-muted-foreground">
                      Must be at least 8 characters long
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      autoComplete="new-password"
                      aria-describedby="confirm-password-error"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    aria-label={isLoading ? "Creating account..." : "Create your free account"}
                  >
                    {isLoading ? "Creating account..." : "Create Free Account"}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <div className="text-sm text-muted-foreground text-center">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Sign in to existing account"
                  >
                    Sign In
                  </Link>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  <Link
                    to="/"
                    className="hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Return to homepage"
                  >
                    ← Back to Home
                  </Link>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
