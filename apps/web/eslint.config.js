//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config";

import baseConfig from '../../eslint.config.mjs';

// export default [...tanstackConfig];

export default [
    baseConfig, // Extend from the base configuration
    ...tanstackConfig
    // {
    //     // Add or override rules here
    //     rules: {
    //         'no-console': 'warn',
    //         'indent': ['error', 2],
    //         // ... more rules
    //     },
    //     // You can also add or override other properties like plugins, settings, etc.
    //     files: ['src/**/*.mjs'], // Apply this config to specific files
    // },
];