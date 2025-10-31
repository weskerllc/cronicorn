---
applyTo: '**'
---
# Instructions for running commands in local development

For local development, it is preferred to have a single `.env` file in the ROOT of the repo that contains all environment variables needed for local development across all apps and packages. When running commands in local development, you can use the existing `package.json` scripts that load this `.env` file using the `dotenv-cli` package. Or run your own command using the following format `pnpm exec dotenv -e .env -- <command>`. 