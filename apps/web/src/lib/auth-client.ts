import { createAuthClient } from "better-auth/react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3333";

console.log("API URL:", apiUrl);

export const authClient = createAuthClient({
  baseURL: apiUrl,
  fetchOptions: {
    credentials: "include", // Important: ensures cookies are sent cross-origin
  },
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
