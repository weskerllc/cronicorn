/**
 * Auth session type - unified for both OAuth and API key sessions
 */
export type AuthSession = {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
};

/**
 * Context extension for authenticated routes
 */
export type AuthContext = {
  session: AuthSession;
  userId: string; // Convenience accessor
};
