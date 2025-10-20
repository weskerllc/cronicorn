//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config";

export default [
  ...tanstackConfig,
  {
    // Web-specific overrides
    rules: {
      // Allow console in development (common in React apps)
      'no-console': 'warn',
    },
  },
];