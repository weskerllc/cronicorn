import type { OpenAPIObjectConfigure } from "@hono/zod-openapi";

import { apiReference } from "@scalar/hono-api-reference";

import type { AppBindings, AppOpenAPI } from "../types.js";

import packageJSON from "../../package.json" with { type: "json" };

export default function configureOpenAPI(app: AppOpenAPI, apiURL: string) {
    const servers = [
        {
            url: apiURL,
            description: "Cronicorn API",
        },
        // Only include local dev server in development mode
        // ...(env.NODE_ENV === "development"
        //   ? [
        //       {
        //         url: "http://localhost:9999",
        //         description: "Local development environment",
        //       },
        //     ]
        //   : []
        // ),
    ];
    // Define OpenAPI document
    const openApiDocument: OpenAPIObjectConfigure<AppBindings, "/doc"> = {
        openapi: "3.0.0", // Using 3.0.0 for broader compatibility
        info: {
            version: "v1",
            title: "Cronicorn API",
            description: "A powerful API for managing and executing recurring tasks and jobs",
            termsOfService: "https://cronicorn.example/terms/",
            contact: {
                name: "API Support",
                url: "https://cronicorn.example/support",
                email: "api@cronicorn.example",
            },
            license: {
                name: "MIT",
                url: "https://opensource.org/licenses/MIT",
            },
        },
        tags: [
            {
                name: "Jobs",
                description: `A **Job** in Cronicorn represents a scheduled task defined with:

- A **plain‑English rule** (e.g. “Run health check every 15 min, but every 3 in if errors > 2%”)
- A list of **Endpoints** (HTTP calls made when the job triggers)

### ✅ Purpose  
Jobs capture intent, target actions, and context. They're also the scope for incoming messages — each message belongs to a specific job.

### 🔁 How It Behaves  
The AI agent linked to the job:  
- Monitors incoming messages (e.g. metrics, state updates)  
- Decides *when* to run, *how often*, and *which endpoints* to call  
- Adjusts the schedule in real time based on conditions

### ✏️ Example (JSON)

\`\`\`json
{
  "description": "Check health every 15 minutes, but run every 3 minutes if error rate > 2%. Skip when maintenance mode is active.",
  "endpoints": [
    {
      "url": "https://api.mysite.com/check",
      "method": "GET"
    }
  ]
}
\`\`\`

`,
            },
            {
                name: "Planets",
                description: "Everything about planets",
            },
            {
                name: "Celestial Bodies",
                description: "Celestial bodies are the planets and satellites in the Scalar Galaxy.",
            },
        ],
        servers,
        security: [
            {
                "API Key": [],
                "API Secret": [],
            },
            {
                bearerAuth: [],
            },
        ],
    };

    // Register bearer auth scheme
    // app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    //   type: "http",
    //   scheme: "bearer",
    //   in: "header",

    //   bearerFormat: "JWT",
    //   description: "JWT Bearer token authentication",
    // });

    // Register API Key auth scheme
    // app.openAPIRegistry.registerComponent("securitySchemes", "API Key", {
    //     type: "apiKey",
    //     in: "header",
    //     name: "X-API-Key",
    //     // description: "API key authentication. Must be used with X-API-Secret header.",
    // });

    // Register API Secret auth scheme
    // app.openAPIRegistry.registerComponent("securitySchemes", "API Secret", {
    //   type: "apiKey",
    //   in: "header",
    //   name: "X-API-Secret",
    //   // description: "API secret authentication. Must be used with X-API-Key header.",
    // });

    app.doc("/doc", openApiDocument);

    app.get(
        "/reference",
        apiReference({
            pageTitle: "Cronicorn API Reference",
            theme: "alternate",
            layout: "modern",
            baseServerURL: apiURL,
            defaultHttpClient: {
                targetKey: "js",
                clientKey: "fetch",
            },
            spec: {
                url: `/api/doc`,
            },
            servers,
            // Authentication configuration for Scalar UI
            authentication: {
                // Set which security scheme to prefer by default
                // preferredSecurityScheme: "apiKey",
                securitySchemes: {
                    // API Key auth configuration
                    "API Key": {
                        name: "X-API-Key",
                        in: "header",
                        value: "", // Empty by default, user will fill in
                    },
                    // API Secret auth configuration
                    // "API Secret": {
                    //   name: "X-API-Secret",
                    //   in: "header",
                    //   value: "", // Empty by default, user will fill in
                    // },
                    // JWT Bearer auth configuration
                    // bearerAuth: {
                    //   in: "header",
                    //   token: "", // Empty by default, user will fill in
                    // },
                },
            },
        }),
    );
}
