import { createContext, useContext } from "react";

import { useSession } from "./auth-client";

import type { ReactNode } from "react";
import type { Session, User } from "./auth-client";

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, isPending, error } = useSession();

  const value: AuthContextValue = {
    session: session ?? null,
    user: session?.user ?? null,
    isAuthenticated: !!session?.user,
    isLoading: isPending,
    error: error ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
}
