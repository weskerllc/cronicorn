import { RouterProvider } from '@tanstack/react-router'
import { UnheadProvider, createHead } from '@unhead/react/client'

import { ThemeProvider } from "@cronicorn/ui-library/components/theme-provider"
import { router } from './router'
import { TailwindIndicator } from './components/tailwind-indicator';
import type { AuthContextValue } from './lib/auth-context';

// Create a lazy auth resolver that only initializes when needed
let resolveAuthClient: (client: AuthContextValue) => void;
let authClientPromise: Promise<AuthContextValue> | null = null;

function getAuthClient(): Promise<AuthContextValue> {
  if (!authClientPromise) {
    authClientPromise = new Promise((resolve) => {
      resolveAuthClient = resolve;
    });
  }
  return authClientPromise;
}

export { resolveAuthClient };

export default function App() {
  const head = createHead()

  return (
    <UnheadProvider head={head}>
      <ThemeProvider storageKey="cronicorn-ui-theme">
        <TailwindIndicator />
        <RouterProvider router={router} context={{ auth: getAuthClient }} />
      </ThemeProvider>
    </UnheadProvider>
  )
}

