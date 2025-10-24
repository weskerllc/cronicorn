import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Input } from "@cronicorn/ui-library/components/input";
import { Label } from "@cronicorn/ui-library/components/label";
import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { AlertCircle, UserPlus } from "lucide-react";

import { signUp } from "@/lib/auth-client";
import { SEO, createBreadcrumbStructuredData } from "@/components/SEO";
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
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      createBreadcrumbStructuredData([
        { name: "Home", url: "/" },
        { name: "Create Account", url: "/register" }
      ]),
      {
        "@type": "WebPage",
        "name": "Create Your Cronicorn Account",
        "description": "Sign up for Cronicorn to get started with AI-powered job scheduling. Create your free account and access intelligent automation tools.",
        "url": `${siteConfig.siteUrl}/register`,
        "mainEntity": {
          "@type": "WebSite",
          "name": siteConfig.siteName,
          "url": siteConfig.siteUrl
        },
        "potentialAction": {
          "@type": "RegisterAction",
          "target": `${siteConfig.siteUrl}/register`,
          "name": "Create Account"
        }
      }
    ]
  };

  return (
    <>
      <SEO
        title="Create Account"
        description="Join Cronicorn today and start using AI-powered job scheduling. Create your free account to access intelligent cron job management, automation tools, and advanced analytics."
        keywords={[
          "cronicorn signup",
          "create account",
          "job scheduling registration",
          "free cron job management",
          "automation platform signup",
          "AI scheduling account"
        ]}
        canonical="/register"
        noindex={true} // Registration pages typically shouldn't be indexed
        structuredData={structuredData}
      />

      <div className="flex min-h-screen items-center justify-center p-4">
        <main className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <UserPlus className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>
                Join {siteConfig.siteName} and start optimizing your scheduled tasks with AI-powered automation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={isLoading}
                    required
                    aria-describedby="name-error"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    aria-describedby="email-error"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    minLength={8}
                    aria-describedby="password-error"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    minLength={8}
                    aria-describedby="confirm-password-error"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <div className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </div>
              <div className="text-xs text-muted-foreground text-center max-w-sm">
                By creating an account, you agree to our{" "}
                <a href="/terms" className="text-primary hover:underline">terms of service</a>
                {" "}and{" "}
                <a href="/privacy" className="text-primary hover:underline">privacy policy</a>.
              </div>
            </CardFooter>
          </Card>
        </main>
      </div>
    </>
  );
}
