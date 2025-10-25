import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

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
    // auth will initially be undefined
    // We'll be passing down the auth state from within a React component
    auth: undefined!,
  },
})