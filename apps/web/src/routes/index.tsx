import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";

import { signOut, useSession } from "@/lib/auth-client";

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

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Cronicorn! 🦄</h1>
        <p className="text-xl text-muted-foreground">
          AI-powered job scheduling made simple
        </p>
      </div>

      {session
        ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hello, {session.user.name}! 👋</CardTitle>
                  <CardDescription>
                    Email: {session.user.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <Button asChild>
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
            </div>
          )
        : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Get Started</CardTitle>
                  <CardDescription>
                    Sign in to get started with AI-powered job scheduling
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <Button asChild>
                    <Link to="/login">
                      Login
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/register">
                      Register
                    </Link>
                  </Button>
                  <Button variant="secondary" asChild>
                    <Link to="/pricing">
                      View Pricing
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
    </div>
  );
}
