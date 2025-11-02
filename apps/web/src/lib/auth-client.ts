import { apiKeyClient, deviceAuthorizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// API is proxied at /api, no need for full URL
const siteUrl = import.meta.env.VITE_SITE_URL || "http://localhost:5173";

const authUrl = `${siteUrl}/api/auth`;

export const authClient = createAuthClient({
  baseURL: authUrl,
  fetchOptions: {
    credentials: "include", // Important: ensures cookies are sent cross-origin
  },
  plugins: [
    apiKeyClient(),
    deviceAuthorizationClient(), // OAuth Device Flow for AI agents
  ],
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  forgetPassword,
  resetPassword,
} = authClient;

export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
