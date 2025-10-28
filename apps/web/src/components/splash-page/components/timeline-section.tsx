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
    return (
        <section className="relative w-full flex flex-col items-center justify-start px-6 pt-4 md:pt-6 pb-16 md:pb-20">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-6 md:mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 md:mb-4">
                        See Cronicorn in Action
                    </h2>
                    <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
                        Explore real-world scenarios showcasing intelligent scheduling optimization
                    </p>
                </div>
                <TimelineTabs tabs={tabData} variant="default" />
            </div>
        </section>
    )
}