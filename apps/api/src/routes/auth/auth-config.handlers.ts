import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "../../types.js";
import type * as routes from "./auth-config.routes.js";

/**
 * GET /auth/config
 * Returns which authentication methods are enabled
 */
export const getAuthConfig: AppRouteHandler<routes.GetAuthConfigRoute> = async (c) => {
    const config = c.get("config");

    const hasEmailPassword = !!(config.ADMIN_USER_EMAIL && config.ADMIN_USER_PASSWORD);
    const hasGitHubOAuth = !!(config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET);

    return c.json(
        {
            hasEmailPassword,
            hasGitHubOAuth,
        },
        HttpStatusCodes.OK,
    );
};
