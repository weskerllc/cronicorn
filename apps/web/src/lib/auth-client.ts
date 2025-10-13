import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: "http://localhost:3000", // API server URL
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