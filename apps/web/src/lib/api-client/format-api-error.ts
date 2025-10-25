import type { ErrorSchema } from "./api-client";
// TODO: This is meant to format zod validation errors from api
// Not sure if we need this
export default function formatApiError(apiError: ErrorSchema) {
  return apiError
    .error
    .issues
    .reduce((all, issue) => `${all + issue.path.join(".")}: ${issue.message}\n`, "");
}
