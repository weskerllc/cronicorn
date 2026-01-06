import { createFileRoute } from "@tanstack/react-router";
import { InteractiveDemo } from "@/components/demo/interactive-demo";
import { QuickStartTutorial } from "@/components/demo/quick-start-tutorial";
import { keywords, metaDescriptions, pageTitles, urls } from "@cronicorn/content";
import { createSEOHead } from "@/lib/seo";

export const Route = createFileRoute("/_public/demo")({
  head: () => {
    return createSEOHead({
      title: pageTitles.demo || "Live Demo - See Cronicorn in Action",
      description: metaDescriptions.demo || "Try Cronicorn's intelligent scheduling without signup. Simulate real-world scenarios and see AI adaptation in action.",
      keywords: [...keywords.tier1, "demo", "interactive demo", "try now", "sandbox"],
      url: "/demo",
    });
  },
  component: DemoPage,
});

function DemoPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-12 space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            🎮 Interactive Demo
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
            See Cronicorn in Action
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No signup required. Simulate real-world scenarios and watch AI adapt in real-time.
          </p>
        </div>
      </section>

      {/* Interactive Demo */}
      <InteractiveDemo />

      {/* Quick Start Tutorial */}
      <QuickStartTutorial />

      {/* CTA Section */}
      <section className="text-center space-y-6 py-12">
        <h2 className="text-3xl font-bold">Ready to try with your endpoints?</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Start scheduling smarter in 5 minutes. No credit card required.
        </p>
        <div className="flex gap-4 justify-center items-center flex-wrap">
          <a
            href={urls.product.login}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-base hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Start Free
          </a>
          <a
            href={urls.docs.quickStart || "/docs/quick-start"}
            className="px-6 py-3 border-2 border-border text-foreground rounded-lg font-semibold text-base hover:border-foreground/30 transition-all duration-200"
          >
            View Documentation
          </a>
        </div>
      </section>
    </main>
  );
}
