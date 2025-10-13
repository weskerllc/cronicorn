import { Link, createFileRoute } from "@tanstack/react-router";
import { useSession } from "../lib/auth-client";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { data: session } = useSession();

  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
      {session && <div>Hello {session.user.name}</div>}
                          <Link to={'/login'}>Login
                          </Link>
                          <Link to={'/register'}>Register
                          </Link>

    </div>
  );
}