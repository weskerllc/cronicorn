import { Link, createFileRoute } from "@tanstack/react-router";

import { Button } from "@cronicorn/ui-library/components/button";

import { signOut, useSession } from "../lib/auth-client";

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
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Welcome to Cronicorn! 🦄</h1>
      <Button>
        Test Shad
      </Button>
      {session
        ? (
            <div className="space-y-6">
              <div className="p-6 border rounded-lg">
                <p className="text-xl mb-4">
                  Hello,
                  {" "}
                  {session.user.name}
                  ! 👋
                </p>
                <p className="text-gray-600">
                  Email:
                  {" "}
                  {session.user.email}
                </p>
              </div>

              <div className="flex gap-4">
                <Link
                  to="/pricing"
                  className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View Pricing
                </Link>
                <Link
                  to="/settings"
                  className="px-6 py-3 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Account Settings
                </Link>
              </div>

              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          )
        : (
            <div className="space-y-6">
              <p className="text-xl text-gray-600">
                Sign in to get started with AI-powered job scheduling
              </p>
              <div className="flex gap-4">
                <Link
                  to="/login"
                  className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-3 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Register
                </Link>
                <Link
                  to="/pricing"
                  className="px-6 py-3 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          )}
    </div>
  );
}
