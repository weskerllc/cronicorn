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
import { SEO } from "@/components/SEO";
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
  const loginStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Login - Cronicorn",
    description: "Sign in to your Cronicorn account to access AI-powered job scheduling tools",
    url: `${siteConfig.url}/login`,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.siteName,
      url: siteConfig.url
    },
    potentialAction: {
      "@type": "LoginAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/login`,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform"
        ]
      },
      object: {
        "@type": "DigitalDocument",
        name: "User Account",
        description: "Access to Cronicorn scheduling platform"
      }
    }
  };

  return (
    <>
      <SEO
        title={siteConfig.pageTitles.login}
        description={siteConfig.metaDescriptions.login}
        keywords={["login", "sign in", "authentication", "user account", "dashboard access"]}
        url="/login"
        noindex={true}
        structuredData={loginStructuredData}
      />

      <main className="flex min-h-screen items-center justify-center p-4" role="main">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your {siteConfig.siteName} account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="size-4" aria-hidden="true" />
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

            <form onSubmit={handleEmailLogin} className="space-y-4" noValidate>
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
                  autoComplete="current-password"
                  aria-describedby="password-error"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                aria-label={isLoading ? "Signing in..." : "Sign in to your account"}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="text-sm text-muted-foreground text-center">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Create a new account"
              >
                Create Account
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
      </main>
    </>
  );
}
