import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'
import type { AuthContextValue } from './lib/auth-context';

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}


export const router = createRouter({
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,
  routeTree,
  context: {
    auth: undefined! as Promise<AuthContextValue>,
  },
})