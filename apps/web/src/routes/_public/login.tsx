import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Input } from "@cronicorn/ui-library/components/input";
import { Label } from "@cronicorn/ui-library/components/label";
import { Separator } from "@cronicorn/ui-library/components/separator";
import { Skeleton } from "@cronicorn/ui-library/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, isRedirect, redirect, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Github, Mail } from "lucide-react";
import React, { useState } from "react";

import { brand, metaDescriptions, pageTitles, structuredData } from "@cronicorn/content";
import { APP_URL } from "@/config";
import { authConfigQueryOptions } from "@/lib/api-client/queries/auth-config.queries";
import { getSession, signIn } from "@/lib/auth-client";
import { createSEOHead } from "@/lib/seo";

type LoginSearch = {
  redirect?: string;
};

export const Route = createFileRoute("/_public/login")({
  ssr: false,
  beforeLoad: async ({ search }) => {
    // Redirect authenticated users away from login page
    try {
      const result = await getSession();
      if (result.data) {
        // User is already logged in, redirect to dashboard or the intended destination
        const redirectPath = search.redirect || "/dashboard";
        throw redirect({ to: redirectPath });
      }
    } catch (e) {
      // Re-throw TanStack Router redirects (they use throw for control flow)
      if (isRedirect(e)) {
        throw e;
      }
      // If getSession fails (e.g., no session), continue to show login page
    }
  },
  head: () => {
    const loginStructuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Login",
      description: structuredData.login.description,
      url: `${APP_URL}/login`,
      mainEntity: {
        "@type": "LoginAction",
        name: "User Login",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${APP_URL}/login`,
          actionPlatform: [
            "https://schema.org/DesktopWebPlatform",
            "https://schema.org/MobileWebPlatform"
          ]
        }
      },
      object: {
        "@type": "DigitalDocument",
        name: "User Account",
        description: structuredData.login.accountDescription
      }
    };

    return createSEOHead({
      title: pageTitles.login,
      description: metaDescriptions.login,
      url: "/login",
      noindex: true,
      structuredData: loginStructuredData,
    });
  },
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isClient, setIsClient] = useState(false);
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();



  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const { data: authConfig, isLoading: isLoadingConfig } = useQuery({
    ...authConfigQueryOptions(),
    enabled: isClient,
  });

  const getRedirectPath = () => {
    if (redirectTo) {
      try {
        const url = new URL(redirectTo);
        if (url.origin === window.location.origin) {
          return url.pathname + url.search;
        }
      } catch {
        return redirectTo;
      }
    }
    return "/dashboard";
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const redirectPath = getRedirectPath();

      await signIn.email(
        {
          email,
          password,
          callbackURL: redirectPath,
        },
        {
          onSuccess: () => {
            navigate({ to: redirectPath });
          },
          onError: (ctx) => {
            setError(ctx.error.message || "Failed to sign in. Please check your credentials.");
            setIsLoading(false);
          },
        }
      );
    } catch (err) {
      setError(`Failed to sign in: ${err instanceof Error ? err.message : 'Please try again'}`);
      setIsLoading(false);
    }
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
          navigate({ to: redirectPath });
        },
        onError: () => {
          setError("Failed to sign in with GitHub. Please try again.");
          setIsLoading(false);
        },
      },
    );
  };

  return (
    <>
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-400px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome to {brand.name}</CardTitle>
            <CardDescription className="text-center">
              Sign in to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="size-4" aria-hidden="true" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Show skeleton while config is being fetched - optimized for GitHub-only (prod default) */}
            {isLoadingConfig && (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
              </div>
            )}

            {/* Email/Password Login Form - only show if enabled */}
            {!isLoadingConfig && authConfig?.hasEmailPassword && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your-email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    aria-label="Email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    aria-label="Password"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                  aria-label="Sign in with email"
                >
                  <Mail className="mr-2 size-5" aria-hidden="true" />
                  {isLoading ? "Signing in..." : "Sign in with Email"}
                </Button>
              </form>
            )}

            {/* Show separator only if both methods are enabled */}
            {!isLoadingConfig && authConfig?.hasEmailPassword && authConfig.hasGitHubOAuth && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
            )}

            {/* GitHub OAuth Login - only show if enabled */}
            {!isLoadingConfig && authConfig?.hasGitHubOAuth && (
              <Button
                onClick={handleGithubLogin}
                disabled={isLoading}
                className="w-full"
                size="lg"
                variant="outline"
                aria-label="Sign in with GitHub"
              >
                {isLoading ? (
                  <div className="mr-2 size-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                ) : (
                  <Github className="mr-2 size-5" aria-hidden="true" />
                )}
                Sign in with GitHub
              </Button>
            )}

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
      </div>
    </>
  );
}
