import { Outlet, createFileRoute } from "@tanstack/react-router";
import { brand, urls } from "@cronicorn/content";

import BackgroundEffects from "../components/splash-page/components/background-effects";
import HeaderSection from "../components/splash-page/components/header-section";
import { Footer2 } from "@/components/nav/footer";
import AppLogo from "../logo.svg?react";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

function PublicLayout() {
  return (
    <div className="bg-background min-h-screen flex flex-col">
      {/* Background effects and header */}
      <div className="relative">
        <BackgroundEffects />
        <HeaderSection />
      </div>

      {/* Main content area */}
      <main className="flex-1 relative pt-16">
        <Outlet />
      </main>

      {/* Footer */}
      <div className="w-full px-4 md:px-8 border-t border-border/40">
        <Footer2
          tagline={brand.title}
          logoSlot={
            <a href={urls.product.home} className="flex items-center space-x-2">
              <AppLogo className="size-12 fill-muted-foreground" aria-label="Cronicorn intelligent cron job scheduling platform logo" />
              <span className="font-medium text-2xl text-muted-foreground">{brand.name}</span>
            </a>
          }
          menuItems={[
            {
              title: "Product",
              links: [
                { text: "Home", url: urls.product.home },
                { text: "Pricing", url: urls.product.pricing },
                { text: "Get Started", url: urls.product.dashboard },
              ],
            },
            {
              title: "Resources",
              links: [
                { text: "Documentation", url: urls.docs.base },
                { text: "Quickstart Guide", url: urls.docs.quickstart },
                { text: "API Playground", url: urls.docs.apiReference },
                { text: "MCP Server", url: urls.docs.mcpServer },
                { text: "Use Cases", url: urls.docs.useCases },
                { text: "Architecture", url: urls.docs.architecture },
              ],
            },
            {
              title: "Community",
              links: [
                { text: "GitHub", url: urls.github.repo },
                { text: "Discussions", url: urls.github.discussions },
                { text: "Support", url: urls.github.issues },
              ],
            },
            {
              title: "Legal",
              links: [
                { text: "Privacy Policy", url: urls.legal.privacy },
                { text: "Terms of Service", url: urls.legal.terms },
              ],
            },
          ]}
          bottomLinks={[
            { text: "Privacy Policy", url: urls.legal.privacy },
            { text: "Terms of Service", url: urls.legal.terms },
          ]}
        />
      </div>
    </div>
  );
}
