import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Global test settings
        globals: true,
        environment: 'node',
        coverage: {
            provider: "v8",
            reporter: ["text", "lcov", "html"],
            reportsDirectory: "./coverage",
            all: true,
            include: ["src/**/*.{ts,tsx}"],
            exclude: ['**/node_modules/**', '**/dist/**'],

        },
        include: ['**/*.test.ts', '**/*.spec.ts'],
        exclude: ['**/node_modules/**', '**/dist/**'],
    },
    resolve: {
        alias: {
            // Add any aliases you may need for imports
            '@cronicorn/core-schemas': resolve(__dirname, './packages/core-schemas/src'),
            '@cronicorn/contracts': resolve(__dirname, './packages/contracts/src'),
            '@cronicorn/feature-jobs': resolve(__dirname, './packages/feature-jobs/src'),
            '@cronicorn/feature-job-endpoints': resolve(__dirname, './packages/feature-job-endpoints/src'),
            '@cronicorn/feature-execution': resolve(__dirname, './packages/feature-execution/src'),
            '@cronicorn/feature-endpoints': resolve(__dirname, './packages/feature-endpoints/src'),
        },
    },

});
