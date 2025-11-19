import apiClient from "@cronicorn/api/client";
import type { ErrorSchema } from "@cronicorn/api/client";

const getBaseURL = () => {
    const apiUrl = typeof process !== 'undefined' ? process.env.API_URL : undefined;
    return apiUrl || import.meta.env.VITE_API_URL || "http://localhost:3333";
};

export type { ErrorSchema };
export default apiClient(getBaseURL(), {
    init: {
        credentials: "include",
    },
});
