/// <reference types="vite/client" />

declare module "*.svg?react" {
    import type React from "react";

    const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
    export default ReactComponent;
}