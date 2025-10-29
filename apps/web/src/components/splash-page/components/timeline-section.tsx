import { CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { TimelineTabs } from "../timeline/timeline-tabs"

interface TimelineSectionProps {
    tabData: Array<{
        id: string
        label: string
        content: React.ReactNode
        icon: React.ReactNode
    }>
}

export default function TimelineSection({ tabData }: TimelineSectionProps) {
    const [activeScenario, setActiveScenario] = useState("flash-sale")

    // Scenario-specific automation benefits (3 high-impact items per scenario for condensed view)
    const scenarioBenefits: Record<string, Array<string>> = {
        "flash-sale": [
            "Detected surge in 90sec, tightened to 30sec monitoring",
            "Activated cache warming + diagnostics automatically",
            "Auto-recovery prevented 47 alerts, zero human intervention"
        ],
        "system-monitoring": [
            "Identified degradation early, escalated 15min→3min",
            "Triggered investigation tools, attempted auto-fix",
            "Restored baseline after confirming recovery"
        ],
        "data-pipeline": [
            "Coordinated 3 dependent stages, adjusted by data volume",
            "Prevented cascading failures with intelligent backoff",
            "Maintained SLA without manual intervention"
        ],
        "api-monitoring": [
            "Detected degradation, escalated to 1min health checks",
            "Activated diagnostic endpoints automatically",
            "Early detection prevented full outage"
        ]
    }

    const currentBenefits = scenarioBenefits[activeScenario] || scenarioBenefits["flash-sale"]

    return (
        <section className="relative w-full flex flex-col items-center justify-start px-6 py-16 md:py-20 border-b border-border/40">
            <div className="max-w-5xl w-full">
                {/* Minimal Vercel-style header */}
                <div className="text-center mb-10 md:mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2.5 tracking-tight">
                        See Cronicorn in Action
                    </h2>
                    <p className="text-muted-foreground/80 text-sm md:text-base max-w-2xl mx-auto">
                        Watch how AI adapts to real-world scenarios
                    </p>
                </div>

                {/* Timeline with integrated benefits */}
                <div className="space-y-5">
                    <TimelineTabs
                        tabs={tabData}
                        variant="default"
                        onTabChange={setActiveScenario}
                    />

                    {/* Condensed Benefits - subtle footer */}
                    <div className="border-t border-border/20 pt-5 px-2">
                        <div className="flex items-start gap-3 text-sm">
                            <span className="text-muted-foreground/70 font-medium text-xs">Automated:</span>
                            <div className="space-y-2.5">
                                {currentBenefits.map((item, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                                        <span className="text-muted-foreground/70 leading-relaxed text-xs">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}