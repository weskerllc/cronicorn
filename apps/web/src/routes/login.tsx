import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { AlertCircle, Github } from "lucide-react";

import { signIn } from "@/lib/auth-client";
import { SEO } from "@/components/SEO";
import siteConfig from "@/site-config";

type LoginSearch = {
  redirect?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    return {
      redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  // Determine where to redirect after login
  const getRedirectPath = () => {
    if (redirect) {
      try {
        const url = new URL(redirect);
        // Only allow redirects to the same origin for security
        if (url.origin === window.location.origin) {
          return url.pathname + url.search;
        }
      } catch {
        // If redirect is not a full URL, assume it's a path
        return redirect;
      }
    }
    return "/dashboard";
  };

  const handleGithubLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const redirectPath = getRedirectPath();
    const callbackURL = `${window.location.origin}${redirectPath}`;

    await signIn.social(
      {
        provider: "github",
        callbackURL,
      },
      {
        onSuccess: () => {
          navigate({ to: redirectPath as any });
        },
        onError: () => {
          setError("Failed to sign in with GitHub. Please try again.");
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
            <CardTitle className="text-2xl text-center">Welcome to {siteConfig.siteName}</CardTitle>
            <CardDescription className="text-center">
              Sign in with your GitHub account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="size-4" aria-hidden="true" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleGithubLogin}
              disabled={isLoading}
              className="w-full"
              size="lg"
              aria-label="Sign in with GitHub"
            >
              <Github className="mr-2 size-5" aria-hidden="true" />
              {isLoading ? "Signing in..." : "Sign in with GitHub"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By signing in, you agree to our terms of service and privacy policy
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
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
