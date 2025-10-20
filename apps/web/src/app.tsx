import { RouterProvider } from '@tanstack/react-router'


import React from 'react';
import { router } from './router'
import {  AuthProvider, useAuth } from './lib/auth-context'
import type {AuthContextValue} from './lib/auth-context';

let resolveAuthClient: (client: AuthContextValue) => void;
const authClient: Promise<AuthContextValue> = new Promise(
  (resolve) => { resolveAuthClient = resolve; },
);


function InnerApp() {
  const hookSession = useAuth();
  // Resolve the auth client when session is ready or immediately in dev
  React.useEffect(() => {
    if (!hookSession.isLoading) {
      resolveAuthClient(hookSession);
    }
  }, [hookSession]);
  return <RouterProvider  router={router} context={{ auth: authClient }} />;

}

export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  )
}

