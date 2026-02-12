import { createRouter } from "../../types.js";
import * as handlers from "./signing-keys.handlers.js";
import * as routes from "./signing-keys.routes.js";

const router = createRouter()
  .openapi(routes.getSigningKey, handlers.getSigningKey)
  .openapi(routes.createSigningKey, handlers.createSigningKey)
  .openapi(routes.rotateSigningKey, handlers.rotateSigningKey);

export default router;
