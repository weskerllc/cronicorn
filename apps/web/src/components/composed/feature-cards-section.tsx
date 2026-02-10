import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Eye, MessageSquare, Network, Shield } from "lucide-react";

interface FeatureCard {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const features: Array<FeatureCard> = [
    {
        icon: <Eye className="size-6" />,
        title: "Reads Response Bodies",
        description: "AI interprets your endpoint's JSON fields — status, error rates, queue depth — and adapts scheduling automatically.",
    },
    {
        icon: <MessageSquare className="size-6" />,
        title: "Plain English Descriptions",
        description: "Write \"poll faster when error_rate > 5%\" and the AI acts on it. No rules engine, no config files, no code.",
    },
    {
        icon: <Network className="size-6" />,
        title: "Sibling Coordination",
        description: "Endpoints in the same job see each other's responses. A failing health check triggers a recovery endpoint automatically.",
    },
    {
        icon: <Shield className="size-6" />,
        title: "Guardrails Built In",
        description: "Min/max intervals, TTL-expiring hints, and automatic baseline fallback. AI adapts within your constraints.",
    },
];
export function FeatureCardsSection() {
    return (
        <section className="w-full py-16 md:py-20 lg:py-24" aria-labelledby="features-heading">
            <div className="text-center mb-12 md:mb-16">
                <h2 id="features-heading" className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                    How endpoints adapt
                </h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    Set a baseline schedule, describe what matters, and the AI reads every response to decide what happens next.
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
