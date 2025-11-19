import { Outlet, createFileRoute } from "@tanstack/react-router";
import { brand, urls } from "@cronicorn/content";

import BackgroundEffects from "../components/splash-page/components/background-effects";
import HeaderSection from "../components/splash-page/components/header-section";
import appLogoUrl from "../logo.svg";
import { Footer2 } from "@/components/nav/footer";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

function PublicLayout(




) {

  return (

    <main className="bg-background" role="main">
      {/* Hero Section with Particle Animation Background */}
      <section className="  relative min-h-screen bg-background overflow-hidden" aria-labelledby="hero-heading">
        <BackgroundEffects />
        <HeaderSection />

        <div className="relative w-full max-w-7xl mx-auto mt-14   px-4 md:px-8">
          <Outlet />

        </div>
      </section>

      <div className="w-full   px-4 md:px-8    border-t border-border/40  ">
        <Footer2
          tagline={brand.title}
          logoSlot={<a href={urls.product.home} className="flex items-center space-x-2">
            <img src={appLogoUrl} className="size-12" alt="Cronicorn intelligent cron job scheduling platform logo" />
            <span className="font-medium text-2xl text-muted-foreground">{brand.name}</span>
          </a>}
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

    </main>

  )



}