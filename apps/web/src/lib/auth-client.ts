import { apiKeyClient, deviceAuthorizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const getAPIURL = () => {
  return import.meta.env.VITE_API_URL || "http://localhost:3333";
};

const authUrl = `${getAPIURL()}/api/auth`;

export const authClient = createAuthClient({
  baseURL: authUrl,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    apiKeyClient(),
    deviceAuthorizationClient(),
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
