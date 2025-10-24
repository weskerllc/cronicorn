import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Input } from "@cronicorn/ui-library/components/input";
import { Label } from "@cronicorn/ui-library/components/label";
import { Separator } from "@cronicorn/ui-library/components/separator";
import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { AlertCircle } from "lucide-react";

import { signIn } from "@/lib/auth-client";
import { SEO, createBreadcrumbStructuredData } from "@/components/SEO";
import siteConfig from "@/site-config";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    await signIn.email(
      { email, password },
      {
        onSuccess: () => {
          navigate({ to: "/dashboard" });
        },
        onError: (ctx) => {
          setError((ctx as any)?.message || "Failed to sign in. Please check your credentials.");
          setIsLoading(false);
        },
      },
    );
  };

  const handleGoogleLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    await signIn.social(
      {
        provider: "google",
        callbackURL: `${window.location.origin}/dashboard`,
      },
      {
        onSuccess: () => {
          navigate({ to: "/dashboard" });
        },
        onError: () => {
          setError("Failed to sign in with Google.");
          setIsLoading(false);
        },
      },
    );
  };

  const handleGithubLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    await signIn.social(
      {
        provider: "github",
        callbackURL: `${window.location.origin}/dashboard`,
      },
      {
        onSuccess: () => {
          navigate({ to: "/dashboard" });
        },
        onError: () => {
          setError("Failed to sign in with GitHub.");
          setIsLoading(false);
        },
      },
    );
  };

  // Structured data for login page
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      createBreadcrumbStructuredData([
        { name: "Home", url: "/" },
        { name: "Sign In", url: "/login" }
      ]),
      {
        "@type": "WebPage",
        "name": "Sign In to Cronicorn",
        "description": "Access your AI-powered job scheduling dashboard. Sign in with email, Google, or GitHub to manage your scheduled tasks and cron jobs.",
        "url": `${siteConfig.siteUrl}/login`,
        "mainEntity": {
          "@type": "WebSite",
          "name": siteConfig.siteName,
          "url": siteConfig.siteUrl
        }
      }
    ]
  };

  return (
    <>
      <SEO
        title="Sign In"
        description="Sign in to your Cronicorn account to access AI-powered job scheduling, cron job management, and advanced automation tools. Multiple sign-in options available."
        keywords={[
          "cronicorn login",
          "sign in",
          "job scheduling login",
          "cron job dashboard access",
          "automation platform login"
        ]}
        canonical="/login"
        noindex={true} // Login pages typically shouldn't be indexed
        structuredData={structuredData}
      />

      <div className="flex min-h-screen items-center justify-center p-4">
        <main className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to your {siteConfig.siteName} account to access your AI-powered scheduling dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full"
                  aria-label="Sign in with Google"
                >
                  Sign in with Google
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGithubLogin}
                  disabled={isLoading}
                  className="w-full"
                  aria-label="Sign in with GitHub"
                >
                  Sign in with GitHub
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
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
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    aria-describedby="password-error"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <div className="text-sm text-muted-foreground text-center">
                Don't have an account?{" "}
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Create account
                </Link>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                By signing in, you agree to our terms of service and privacy policy.
              </div>
            </CardFooter>
          </Card>
        </main>
      </div>
    </>
  );
}
