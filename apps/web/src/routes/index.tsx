import { Link, createFileRoute } from "@tanstack/react-router";
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
    <div className="p-2">
      <h3>Welcome Home!</h3>
      {session ? (
        <div>
          <div>Hello {session.user.name}</div>
          <button
            onClick={handleLogout}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      ) : (
        <div>
          <Link to={'/login'}>Login</Link>
          {" | "}
          <Link to={'/register'}>Register</Link>
        </div>
      )}
    </div>
  );
}