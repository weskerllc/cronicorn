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
      tsx: "never",
      jsx: "never",
    }],
  },
  ignores: ["**/migrations/*", "**/*.md", "**/packages/ui-library/*", "**/routeTree.gen.ts", "**/.tanstack/**", "**/apps/web/**"],
});
