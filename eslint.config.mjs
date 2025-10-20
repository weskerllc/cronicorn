import antfu from "@antfu/eslint-config";

export default antfu({
  type: "app",
  typescript: true,
  formatters: true,
  stylistic: {
    indent: 2,
    semi: true,
    quotes: "double",
  },
  rules: {
    "jsonc/sort-keys": [
      "error",
      {
        pathPattern: "^$",
        order: [
          "name",
          "version",
          "private",
          "description",
          "scripts",
          "dependencies",
          "devDependencies",
          "peerDependencies",
        ],
      },
    ],
    "jsonc/auto": "error", // enables auto-fixes for spacing/quotes, etc
    "ts/consistent-type-definitions": ["error", "type"],
    "no-console": ["error"],
    "antfu/no-top-level-await": ["off"],
    "node/prefer-global/process": ["off"],
    "node/no-process-env": ["error"],
    "perfectionist/sort-imports": ["error", {
      tsconfigRootDir: ".",
    }],
    "unicorn/filename-case": ["error", {
      case: "kebabCase",
      ignore: ["README.md"],
    }],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "never",
      },
    ],
    "import/extensions": ["error", "ignorePackages", {
      js: "always",
      ts: "never",
    }],
  },
  ignores: ["**/migrations/*", "**/*.md", "**/packages/ui-library/*", "**/routeTree.gen.ts", "**/.tanstack/**"],
}, {
  // Frontend-specific overrides for apps/web
  files: ["apps/web/**"],
  rules: {
    // Allow console in frontend for debugging
    "no-console": "warn",
    "no-alert": "warn",
    // Allow PascalCase for React components
    "unicorn/filename-case": ["error", {
      case: "kebabCase",
      ignore: [/\.tsx?$/], // Ignore .ts/.tsx files to allow PascalCase components
    }],
    // Allow type assertions in frontend code (common for form data, API responses)
    "ts/consistent-type-assertions": "off",
    // Relax import extensions for frontend (Vite handles this)
    "import/extensions": "off",
    // Allow unused vars for type-only query keys (TanStack Query pattern)
    "unused-imports/no-unused-vars": ["warn", {
      vars: "all",
      varsIgnorePattern: "^(\\$|_)",
      args: "after-used",
      argsIgnorePattern: "^_",
    }],
    // Allow inline ternaries (common in React JSX)
    "style/multiline-ternary": "off",
  },
});
