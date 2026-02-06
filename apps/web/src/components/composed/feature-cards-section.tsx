import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Braces, FileText, GitFork, Shield } from "lucide-react";

interface FeatureCard {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const features: Array<FeatureCard> = [
    {
        icon: <Braces className="size-6" />,
        title: "Reads Your Response Body",
        description: "AI interprets JSON fields like status, error_rate_pct, and queue_depth from your endpoint's response — no parsing code needed.",
    },
    {
        icon: <FileText className="size-6" />,
        title: "Controlled by Descriptions",
        description: "Write \"tighten to 30s when error_rate_pct > 5%\" instead of code rules. The AI matches your description against real response data.",
    },
    {
        icon: <Shield className="size-6" />,
        title: "Bounded by Constraints",
        description: "Set min/max intervals the AI cannot exceed. All hints have TTL and auto-expire back to your baseline schedule.",
    },
    {
        icon: <GitFork className="size-6" />,
        title: "Coordinates Across Endpoints",
        description: "Endpoints in the same job see each other's responses. A failing health check can trigger a recovery endpoint automatically.",
    },
];
export function FeatureCardsSection() {
    return (
        <section className="w-full py-16 md:py-20 lg:py-24" aria-labelledby="features-heading">
            <div className="text-center mb-12 md:mb-16">
                <h2 id="features-heading" className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                    Core Mechanisms
                </h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    Everything the AI does is driven by three things you control: your description, your constraints, and your response body.
                </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {features.map((feature, index) => (
                    <Card
                        key={index}
                        className="group hover:shadow-lg transition-all duration-300 border-border/50"
                    >
                        <CardHeader className="space-y-4">
                            <div className="flex items-start">
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 ease-in-out">
                                    {feature.icon}
                                </div>
                            </div>
                            <CardTitle className="text-xl font-bold leading-tight tracking-tight">{feature.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <CardDescription className="text-base leading-relaxed text-muted-foreground/90">
                                {feature.description}
                            </CardDescription>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}
