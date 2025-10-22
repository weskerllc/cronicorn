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
        onError: (error) => {
          console.error(error);
          setError((error as any)?.message || "Failed to sign in. Please check your credentials.");
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
        onError: (error) => {
          console.error(error);
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
        onError: (error) => {
          console.error(error);
          setError("Failed to sign in with GitHub.");
          setIsLoading(false);
        },
      },
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            Enter your email and password to sign in to your account
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
            >
              Sign in with Google
            </Button>
            <Button
              variant="outline"
              onClick={handleGithubLogin}
              disabled={isLoading}
              className="w-full"
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
                Or continue with
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isLoading}
                required
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
            <Link to="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
