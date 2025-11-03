import { ArrowRight } from "lucide-react";
import { brand, urls } from "@cronicorn/content";

export default function HeroSection() {
    return (
        <section className="relative w-full lg:items-start flex flex-col items-center justify-center">
            <div className="flex flex-col text-center lg:text-left lg:items-start items-center max-w-4xl relative z-10 space-y-6 lg:space-y-8">
                <h1 className="font-sans text-foreground text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-balance max-w-[280px] md:max-w-[500px] lg:max-w-[600px]">
                    {brand.title}
                </h1>
                <p className="font-sans text-muted-foreground text-lg md:text-xl lg:text-2xl leading-relaxed max-w-[350px] md:max-w-[450px] lg:max-w-[500px] lg:mx-0 mx-auto">
                    {brand.description}
                </p>

                {/* CTA Section */}
                <div className="flex gap-4 justify-center lg:justify-start w-full items-center pt-2">
                    <a
                        href={urls.product.signup}
                        className="group px-5 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-base hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        Get Started
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </a>
                    <a
                        href={urls.docs.base}
                        className="px-5 py-2 border-2 border-border text-foreground rounded-lg font-semibold text-base hover:bg-accent hover:border-foreground/30 transition-all duration-200"
                    >
                        View on Github
                    </a>
                </div>
            </div>
        </section>

    )
}