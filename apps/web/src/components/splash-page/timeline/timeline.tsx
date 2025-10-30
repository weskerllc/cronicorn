"use client";

import { cn } from "@cronicorn/ui-library/lib/utils";
import { TimelineConditionCard } from "./timeline-condition";

import { TimelineCurrentIndicator } from "./timeline-current-indicator";
import { TimelineExecutionDot } from "./timeline-execution";
import { useTimeline } from "./use-timeline";
import type { TimelineScenario } from "./timeline-types";

export default function DynamicScheduleTimeline({ scenario }: { scenario: TimelineScenario }) {
  const { steps, config } = scenario;
  const { currentData, currentStep } = useTimeline({ steps, config });

  const currentTime = currentData?.executions[currentData.executions.length - 1]?.time || 0;

  return (
    <div className={cn("w-full max-w-5xl mx-auto lg:h-full ")}>
      {/* Main Timeline Component with enhanced styling */}
      <div
        className="relative bg-gradient-to-b from-muted/5 to-muted/10 lg:h-full rounded border border-border/50 p-3 lg:p-3 overflow-hidden"
        role="region"
        aria-label="Dynamic Schedule Timeline"
      >

        <div className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 mb-4 gap-4 ">

            {/* Live Conditions Section */}
            <section aria-labelledby="conditions-heading">
              <div className="mb-3">
                <h2 id="conditions-heading" className="text-xs font-medium text-muted-foreground/80">
                  Live conditions
                </h2>
              </div>

              <div className="grid  grid-cols-1  gap-3" role="group" aria-label="System conditions">
                {currentData?.conditions.map(condition => (
                  <TimelineConditionCard key={condition.id} condition={condition} />
                ))}
              </div>
            </section>

            {/* Timeline Section */}
            <section aria-labelledby="timeline-heading">
              <div className="flex items-center justify-between mb-3">
                <h2 id="timeline-heading" className="text-xs font-medium text-muted-foreground/80">
                  Execution timeline
                </h2>

                {/* Enhanced Current Time Display */}
                {config.showCurrentTime && (
                  <div
                    className="flex items-center"
                    role="status"
                    aria-live="polite"
                    aria-label={`Current time: ${Math.floor(currentTime)} minutes`}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground/80 font-mono tabular-nums">
                      {Math.floor(currentTime)}m
                    </span>
                  </div>
                )}
              </div>

              {/* Enhanced Timeline Container */}
              <div
                className="relative h-48 bg-background rounded border border-border/50 overflow-visible px-6 py-12"
                role="img"
                aria-label="Timeline visualization showing execution intervals and current progress"
              >
                {/* Enhanced Timeline Base */}
                <div className="absolute top-1/2 left-6 right-6 h-px bg-border/50 transform -translate-y-1/2" />

                {/* Enhanced Time Markers */}
                <div className="absolute inset-0 flex justify-between items-center px-6">
                  {Array.from({ length: 5 }, (_, i) => i * (config.maxTime / 4)).map(time => (
                    <div key={time} className="flex flex-col items-center">
                      <div className="w-px h-2 bg-border/50" />
                      <span className="text-[10px] font-medium text-muted-foreground/80 font-mono mt-1.5 tabular-nums">
                        {time}m
                      </span>
                    </div>
                  ))}
                </div>

                {/* Enhanced Current Time Indicator */}
                <TimelineCurrentIndicator
                  currentTime={currentTime}
                  maxTime={config.maxTime}
                  className="drop-shadow-lg"
                />

                {/* Enhanced Execution Dots */}
                {currentData?.executions.map((execution, index) => (
                  <TimelineExecutionDot
                    key={execution.id}
                    execution={execution}
                    position={index}
                    maxTime={config.maxTime}
                  />
                ))}
              </div>
            </section>

          </div>
          {/* Enhanced Status Caption */}
          <div className="text-left mt-3 px-1" role="status" aria-live="polite">
            <div
              key={currentStep}
              className="text-xs text-muted-foreground/80"
            >
              {currentData?.caption}
            </div>
          </div>

          {/* Enhanced Legend */}
          {/* <div
            className="flex items-center justify-center gap-8 pt-6 border-t border-border"
            role="group"
            aria-label="Legend"
          >
            <div className="flex items-center gap-3">
              <div
                className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-200/50 dark:ring-emerald-800/50"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-foreground">Executed</span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="size-2 rounded-full bg-amber-500 dark:bg-amber-400 shadow-lg shadow-amber-500/30 ring-2 ring-amber-200/50 dark:ring-amber-800/50"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-foreground">Escalated</span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="size-2 rounded-full bg-muted-foreground shadow-lg shadow-muted-foreground/30 ring-2 ring-muted/50"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-foreground">Skipped</span>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
