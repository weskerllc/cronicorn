/* eslint-disable node/no-process-env */
import { z } from "zod";

const envSchema = z.object({
    CRONICORN_API_URL: z.string().url("CRONICORN_API_URL must be a valid URL").default(process.env.NODE_ENV === "development" ? "http://localhost:3333/api" : "https://cronicorn.com/api"),
    CRONICORN_WEB_URL: z.string().url("CRONICORN_WEB_URL must be a valid URL").default(process.env.NODE_ENV === "development" ? "http://localhost:5173" : "https://cronicorn.com"),
});

export type Env = z.infer<typeof envSchema>;

export function loadConfig(): Env {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error("❌ Invalid environment variables:");
        console.error(JSON.stringify(result.error.format(), null, 2));
        process.exit(1);
    }

    return result.data;
}
