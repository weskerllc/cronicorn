"use client";

import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button, buttonVariants } from "@cronicorn/ui-library/components/button";
import AppLogo from "../../icon.svg?react";
import siteConfig from "../../site-config";
import LogoParticles from "../../components/splash-page/cronicorn-particles";
import WhatCronicornDoes from "./what-cronicorn-does/what-cronicorn-does";

export default function SplashPage() {

    return (
        <div className="min-h-screen bg-background relative overflow-hidden mb-8">


            <LogoParticles />
            {/* Background-colored blur behind hero text */}
            {/* <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-64 bg-black/70 blur-2xl animate-pulse"
        style={{ animationDuration: "10s" }}
      >
      </div> */}



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
                <div className="z-50 max-w-3xl w-full bg-red-500">
                    {/* <TimelineTabs tabs={tabData} variant="default" /> */}

                </div>
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
