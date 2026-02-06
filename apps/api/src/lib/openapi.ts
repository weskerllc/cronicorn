import type { OpenAPIObjectConfigure } from "@hono/zod-openapi";

import { brand } from "@cronicorn/content/brand";
import { business } from "@cronicorn/content/business";
import { urls } from "@cronicorn/content/urls";
import { apiReference } from "@scalar/hono-api-reference";
import { createMarkdownFromOpenApi } from "@scalar/openapi-to-markdown";

import type { AppBindings, AppOpenAPI } from "../types.js";

export default function configureOpenAPI(app: AppOpenAPI, apiURL: string) {
  const servers = [
    {
      url: apiURL,
      description: `${brand.name} API`,
    },
  ];

  // Register security schemes with OpenAPI registry
  // API Key authentication (header-based) - matches Better Auth apiKey plugin
  app.openAPIRegistry.registerComponent("securitySchemes", "apiKey", {
    type: "apiKey",
    in: "header",
    name: "x-api-key", // Must be lowercase to match Better Auth's apiKeyHeaders config
    description: "API key for service-to-service authentication. Create an API key in your account settings.",
  });

  // Bearer token authentication - for session-based auth with Bearer tokens
  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Bearer token authentication. Obtain a token via the device authorization flow or session API.",
  });

  // Define OpenAPI document
  const openApiDocument: OpenAPIObjectConfigure<AppBindings, "/doc"> = {
    openapi: "3.0.0",
    info: {
      version: "v1",
      title: `${brand.name} API`,
      description: brand.description,
      termsOfService: `${urls.website}${urls.legal.terms}`,
      contact: {
        name: `${brand.name} Support`,
        url: urls.docs.base,
        email: business.contactPoint.email,
      },
      license: {
        name: "FSL-1.1-MIT",
        url: "https://fsl.software/",
      },
    },
    // Link to full documentation site - Scalar renders this in the UI
    externalDocs: {
      description: `${brand.name} Documentation`,
      url: urls.docs.base,
    },
    tags: [
      {
        name: "Jobs",
        description: `Create, update, pause, resume, and archive scheduled jobs. A job groups one or more endpoints under a shared schedule and AI-driven rules.`,
      },
      {
        name: "Endpoints",
        description: "Manage the HTTP endpoints attached to a job. Each endpoint defines a URL, method, headers, and body that execute when the job triggers.",
      },
      {
        name: "Adaptive Scheduling",
        description: "Dynamically adjust endpoint timing with AI-suggested interval hints, one-shot runs, pause windows, and failure resets.",
      },
      {
        name: "Execution",
        description: "View run history, individual run details, and endpoint health summaries including success rates and failure streaks.",
      },
      {
        name: "AI Analysis",
        description: "Browse AI planner sessions and the reasoning behind scheduling decisions made for each job.",
      },
      {
        name: "Dashboard",
        description: "Retrieve aggregate statistics, activity timelines, and top-level metrics across all jobs and endpoints.",
      },
    ],
    servers,
    // Document-level security - references the registered security schemes
    // OR relationship: either apiKey OR bearerAuth can be used
    security: [
      {
        apiKey: [],
      },
      {
        bearerAuth: [],
      },
    ],
  };

  app.doc("/doc", openApiDocument);

  app.get(
    "/reference",
    apiReference({
      pageTitle: `${brand.name} API Reference`,
      theme: "alternate",
      layout: "modern",
      baseServerURL: apiURL,
      defaultHttpClient: {
        targetKey: "js",
        clientKey: "fetch",
      },
      favicon: "/img/favicon.ico",
      spec: {
        url: `/api/doc`,
      },
      servers,
      // SEO and social sharing metadata
      metaData: {
        title: `${brand.name} API Reference`,
        description: `API documentation for ${brand.name} - ${brand.description}`,
        ogTitle: `${brand.name} API Reference`,
        ogDescription: brand.description,
      },
      // Authentication configuration for Scalar UI
      // Scheme names must match those registered in OpenAPI securitySchemes
      authentication: {
        // Set API key as the preferred scheme (most common for programmatic access)
        preferredSecurityScheme: "apiKey",
        // Persist auth credentials in localStorage for convenience
        securitySchemes: {
          // API Key auth configuration - header name must be lowercase to match Better Auth
          apiKey: {
            name: "x-api-key",
            in: "header",
            value: "", // Empty by default, user will fill in
          },
          // Bearer auth configuration
          bearerAuth: {
            token: "", // Empty by default, user will fill in
          },
        },
      },
    }),
  );

  // Serve LLM-friendly Markdown version of the API spec
  // @see https://llmstxt.org/
  let cachedMarkdown: string | null = null;
  app.get("/llms.txt", async (c) => {
    if (!cachedMarkdown) {
      const specResponse = await app.request("/api/doc");
      const spec = await specResponse.text();
      cachedMarkdown = await createMarkdownFromOpenApi(spec);
    }
    return c.text(cachedMarkdown);
  });
}
