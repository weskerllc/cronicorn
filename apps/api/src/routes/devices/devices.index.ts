import { createRouter } from "../../types.js";
import * as handlers from "./devices.handlers.js";
import * as routes from "./devices.routes.js";

const router = createRouter()
    .openapi(routes.listConnectedDevices, handlers.listConnectedDevices)
    .openapi(routes.revokeDevice, handlers.revokeDevice);

export default router;
