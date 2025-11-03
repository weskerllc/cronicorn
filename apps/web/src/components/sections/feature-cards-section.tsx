import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Activity, Code, Eye, Shield } from "lucide-react";

interface FeatureCard {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const features: Array<FeatureCard> = [
    {
        icon: <Activity className="size-6" />,
        title: "Adapts to Your System's Actual Needs",
        description: "AI analyzes response patterns and metrics to automatically adjust job frequency based on what's actually happening in your system.",
    },
    {
        icon: <Shield className="size-6" />,
        title: "Safe Automation You Can Trust",
        description: "Define your limits and AI works within them. Set schedules, boundaries, and pause anytime—hints expire automatically so nothing runs wild.",
    },
    {
        icon: <Eye className="size-6" />,
        title: "See Exactly Why Jobs Run (or Don't)",
        description: "Complete run history with AI reasoning. Debug scheduling decisions with full audit trails.",
    },
    {
        icon: <Code className="size-6" />,
        title: "Your Services control the Schedule",
        description: "Return metrics in your response and AI uses your system's real data to optimize timing.",
    },
];

export function FeatureCardsSection() {
    return (
        <section className="w-full py-16 md:py-20 lg:py-24" aria-labelledby="features-heading">
            <div className="text-center mb-12 md:mb-16">
                <h2 id="features-heading" className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                    How Intelligent Scheduling Works
                </h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    AI learns from your system's behavior and adjusts automatically within your safety limits.
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
