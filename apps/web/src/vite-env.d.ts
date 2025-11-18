/// <reference types="vite/client" />

declare module "*.svg?react" {
    import type React from "react";

    const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
    export default ReactComponent;
}

// Build-time constants injected by Vite
declare const __APP_VERSION__: string;