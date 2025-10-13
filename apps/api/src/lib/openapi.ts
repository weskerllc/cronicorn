export const openapiConfig = {
    openapi: "3.1.0",
    info: {
        title: "Cronicorn API",
        version: "0.1.0",
        description: "Adaptive AI Scheduler API - Manage jobs, endpoints, and execution runs",
    },
    servers: [
        {
            url: "http://localhost:3000",
            description: "Local development server",
        },
    ],
    tags: [
        { name: "Jobs", description: "Job management endpoints" },
        { name: "Auth", description: "Authentication endpoints" },
        { name: "Health", description: "Health check endpoints" },
    ],
    components: {
        securitySchemes: {
            ApiKeyAuth: {
                type: "apiKey",
                in: "header",
                name: "x-api-key",
            },
            BearerAuth: {
                type: "http",
                scheme: "bearer",
            },
        },
    },
};

/**
 * Helper to create standardized error responses for OpenAPI schemas
 */
export function createErrorResponse(description: string, _status: number) {
    return {
        description,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        error: { type: "string" },
                        message: { type: "string" },
                    },
                    required: ["error"],
                },
            },
        },
    };
}
