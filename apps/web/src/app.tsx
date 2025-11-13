import { RouterProvider } from '@tanstack/react-router'
import { UnheadProvider, createHead } from '@unhead/react/client'

import React from 'react';
import { ThemeProvider } from "@cronicorn/ui-library/components/theme-provider"
import { router } from './router'
import { AuthProvider, useAuth } from './lib/auth-context'
import { TailwindIndicator } from './components/tailwind-indicator';
import type { AuthContextValue } from './lib/auth-context';

let resolveAuthClient: (client: AuthContextValue) => void;
const authClient: Promise<AuthContextValue> = new Promise(
  (resolve) => { resolveAuthClient = resolve; },
);

function InnerApp() {
  const hookSession = useAuth();
  // Resolve the auth client when session is ready
  React.useEffect(() => {
    if (!hookSession.isLoading) {
      resolveAuthClient(hookSession);
    }
  }, [hookSession]);
  return <RouterProvider router={router} context={{ auth: authClient }} />;
}

export default function App() {
  const head = createHead()

  return (
    <UnheadProvider head={head}>
      <AuthProvider>
        <ThemeProvider storageKey="cronicorn-ui-theme">
          <TailwindIndicator />
          <InnerApp />
        </ThemeProvider>
      </AuthProvider>
    </UnheadProvider>
  )
}

