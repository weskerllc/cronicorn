"use client";

import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button, buttonVariants } from "@cronicorn/ui-library/components/button";
import AppLogo from "../../icon.svg?react";
import siteConfig from "../../site-config";
import DynamicScheduleTimeline from "./timeline/timeline";
import { monitoringScenarios } from "./timeline/timeline-scenario-data";
import { TimelineTabs } from "./timeline/timeline-tabs";
import WhatCronicornDoes from "./what-cronicorn-does/what-cronicorn-does";

export default function SplashPage() {
    const tabData = monitoringScenarios.map(scenario => ({
        id: scenario.id,
        label: scenario.name,
        content: <DynamicScheduleTimeline scenario={scenario} />,
        icon: <div className="w-2 h-2 rounded-full bg-current opacity-60" />,
    }));

    return (
        <div className="min-h-screen bg-background relative overflow-hidden mb-8">
            {/* Background effects */}
            <div
                className="absolute top-0 left-0 w-1/4 h-96 bg-gradient-to-br from-background/95 via-secondary/80 to-background/50 blur-3xl animate-pulse"
                style={{ animationDuration: "8s" }}
            >
            </div>

            {/* 2. Light blue blur - slightly overlapping */}
            <div
                className="absolute top-0 left-16 w-1/4 h-96 bg-gradient-to-br from-blue-400/30 via-blue-500/22 to-transparent blur-3xl animate-pulse"
                style={{ animationDuration: "6s", animationDelay: "1s" }}
            >
            </div>

            {/* 3. More prominent blue blur */}
            <div
                className="absolute top-0 left-1/4 w-1/3 h-[28rem] bg-gradient-to-br from-blue-500/40 via-blue-600/32 to-transparent blur-3xl animate-pulse"
                style={{ animationDuration: "7s", animationDelay: "2s" }}
            >
            </div>

            {/* 4. Another blue blur - different height */}
            <div
                className="absolute top-0 left-2/5 w-1/4 h-80 bg-gradient-to-br from-blue-400/35 via-blue-500/25 to-transparent blur-3xl animate-pulse"
                style={{ animationDuration: "5s", animationDelay: "3s" }}
            >
            </div>

            {/* 5. Vivid pink blur - more prominent */}
            <div
                className="absolute top-0 right-1/4 w-1/3 h-80 bg-gradient-to-bl from-pink-500/50 via-purple-500/40 to-transparent blur-3xl animate-pulse"
                style={{ animationDuration: "6s", animationDelay: "1.5s" }}
            >
            </div>

            {/* 6. Softer pink blur on the far right */}
            <div
                className="absolute top-0 right-0 w-1/4 h-96 bg-gradient-to-bl from-pink-400/35 via-purple-400/25 to-transparent blur-3xl animate-pulse"
                style={{ animationDuration: "8s", animationDelay: "4s" }}
            >
            </div>

            {/* Background-colored blur behind hero text */}
            {/* <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-64 bg-black/70 blur-2xl animate-pulse"
        style={{ animationDuration: "10s" }}
      >
      </div> */}

            {/* Faint particles scattered around */}
            <div className="absolute top-16 left-8 w-1 h-1 bg-blue-400/25 rounded-full"></div>
            <div className="absolute top-32 left-24 w-2 h-2 bg-purple-300/20 rounded-full"></div>
            <div className="absolute top-48 left-16 w-1.5 h-1.5 bg-blue-300/30 rounded-full"></div>
            <div className="absolute top-64 left-32 w-1 h-1 bg-pink-400/25 rounded-full"></div>
            <div className="absolute top-80 left-12 w-2.5 h-2.5 bg-blue-500/15 rounded-full"></div>

            <div className="absolute top-24 right-16 w-1.5 h-1.5 bg-pink-300/25 rounded-full"></div>
            <div className="absolute top-40 right-32 w-1 h-1 bg-blue-400/30 rounded-full"></div>
            <div className="absolute top-56 right-8 w-2 h-2 bg-purple-400/20 rounded-full"></div>
            <div className="absolute top-72 right-24 w-1 h-1 bg-pink-500/25 rounded-full"></div>
            <div className="absolute top-88 right-40 w-1.5 h-1.5 bg-blue-300/20 rounded-full"></div>

            <div className="absolute bottom-16 left-16 w-2 h-2 bg-purple-400/25 rounded-full"></div>
            <div className="absolute bottom-32 left-8 w-1 h-1 bg-blue-500/30 rounded-full"></div>
            <div className="absolute bottom-48 left-28 w-1.5 h-1.5 bg-pink-300/20 rounded-full"></div>
            <div className="absolute bottom-64 left-20 w-1 h-1 bg-blue-400/25 rounded-full"></div>

            <div className="absolute bottom-20 right-12 w-1.5 h-1.5 bg-pink-400/30 rounded-full"></div>
            <div className="absolute bottom-36 right-28 w-1 h-1 bg-blue-300/25 rounded-full"></div>
            <div className="absolute bottom-52 right-16 w-2 h-2 bg-purple-300/20 rounded-full"></div>
            <div className="absolute bottom-68 right-36 w-1 h-1 bg-pink-500/25 rounded-full"></div>

            <div className="absolute top-1/3 left-1/4 w-1 h-1 bg-blue-400/20 rounded-full"></div>
            <div className="absolute top-2/3 right-1/3 w-1.5 h-1.5 bg-purple-400/25 rounded-full"></div>
            <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-pink-300/30 rounded-full"></div>

            {/* Header */}
            <header className="relative z-10 px-6 py-6">
                <nav className="flex items-center justify-between max-w-7xl mx-auto gap-8">
                    {/* Logo */}
                    <div className="flex items-center space-x-1">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 -z-10 flex items-center justify-center">
                                <div className="w-full h-full bg-gradient-to-r from-black to-black rounded-lg  blur-2xl  scale-105"></div>
                            </div>
                            <AppLogo className="size-6 text-foreground " />
                        </div>

                        <div className="text-foreground">
                            <span className="font-semibold text-lg">Cronicorn</span>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="hidden md:flex md:flex-auto items-center space-x-8">
                        <a href={siteConfig.docsUrl} target="_blank" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                            Docs
                        </a>
                    </div>

                    {/* CTA Button */}

                    <Link to="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        Get Started
                    </Link>
                </nav>
            </header>

            {/* Hero Section */}
            <main className="relative z-10 gap-8 flex flex-col items-center justify-start min-h-[calc(100vh-120px)] px-6 text-center">
                {/* Hero content */}
                <div className="max-w-4xl mx-auto grid grid-cols-1 items-start w-full gap-12 lg:flex-auto">
                    <div className="animate-fade-in">
                        {/* Main Heading */}
                        <h1 className="text-5xl md:text-6xl font-medium text-foreground mb-2 leading-tight tracking-tight mt-8">
                            {siteConfig.description}
                        </h1>

                        {/* Subtitle */}
                        <p className="text-lg md:text-xl mx-auto text-foreground/70 mb-6 font-light leading-relaxed">
                            {siteConfig.description2}
                        </p>

                        {/* CTA Section */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                            <Link to="/login" className={buttonVariants({ size: "lg" })}>
                                Start Scheduling
                                <ArrowRight className="w-4 h-4 ml-2" />

                            </Link>

                            <Button
                                asChild
                                variant="ghost"
                                size="lg"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <a href={siteConfig.docsUrl} target="_blank">
                                    View API Docs
                                </a>
                            </Button>
                        </div>

                    </div>
                </div>

                {/* Timeline demo */}
                <TimelineTabs tabs={tabData} variant="default" />
                <WhatCronicornDoes />
                {/* Setup guide */}
                {/* <SimpleSetup />

        <WhyCronicorn /> */}

                <div className="flex justify-between items-center gap-4 w-full max-w-5xl border-t py-8">
                    <p>
                        Try it now. It's free, fast, and takes just a few minutes to set up.

                    </p>

                    <Link to="/login" className={buttonVariants({ size: "lg" })}>
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                </div>
            </main>

        </div>
    );
}
