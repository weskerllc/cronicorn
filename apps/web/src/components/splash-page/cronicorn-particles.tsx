"use client"

import { monitoringScenarios } from "./timeline/timeline-scenario-data"
import DynamicScheduleTimeline from "./timeline/timeline"
import WhatCronicornDoes from "./what-cronicorn-does/what-cronicorn-does";
import ParticleCanvas from "./components/particle-canvas";
import BackgroundEffects from "./components/background-effects";
import HeroSection from "./components/hero-section";
import TimelineSection from "./components/timeline-section";

export default function Component() {
  const tabData = monitoringScenarios.map(scenario => ({
    id: scenario.id,
    label: scenario.name,
    content: <DynamicScheduleTimeline scenario={scenario} />,
    icon: <div className="w-2 h-2 rounded-full bg-current opacity-60" />,
  }));

  return (
    <div className="flex flex-col bg-background">
      <div className="min-h-screen bg-background relative overflow-hidden mb-8">
        <BackgroundEffects />
        <HeroSection />
        <TimelineSection tabData={tabData} />
      </div>

      {/* What Cronicorn Does Section */}
      <WhatCronicornDoes />

      {/* Particles Canvas Section - Bottom */}
      <section className="relative w-full h-dvh flex flex-col items-center overflow-hidden justify-center">
        <ParticleCanvas />
      </section>
    </div>
  )
}
