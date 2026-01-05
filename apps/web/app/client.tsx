import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

try {
  hydrateRoot(document, <StartClient />);
} catch (error) {
  console.error("Failed to hydrate application:", error);
  // Report to error tracking service if available
  if (typeof window !== "undefined" && "reportError" in window) {
    window.reportError(error as Error);
  }
}
