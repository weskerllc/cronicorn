import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signIn } from "../lib/auth-client";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    await signIn.email(
      { email, password },
      {
        onSuccess: () => {
          navigate({ to: "/" });
        },
        onError: (error) => {
          console.error(error);
        },
      }
    );
  };

  const handleGoogleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    await signIn.social(
      { 
        provider: "google",
        callbackURL: window.location.origin + "/",
      },
      {
        onSuccess: () => {
          navigate({ to: "/" });
        },
        onError: (error) => {
          console.error(error);
        },
      }
    );
  };

  const handleGithubLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    await signIn.social(
      { 
        provider: "github",
        callbackURL: window.location.origin + "/",
      },
      {
        onSuccess: () => {
          navigate({ to: "/" });
        },
        onError: (error) => {
          console.error(error);
        },
      }
    );
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleEmailLogin}>
        <label htmlFor="email">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="password">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
      <form onSubmit={handleGoogleLogin}>
        <button type="submit">Login with Google</button>
      </form>
      <form onSubmit={handleGithubLogin}>
        <button type="submit">Login with Github</button>
      </form>
    </div>
  );
}