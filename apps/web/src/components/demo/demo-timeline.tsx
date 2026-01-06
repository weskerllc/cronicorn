import { useEffect, useState } from "react";
import { type DemoScenario } from "./demo-scenarios";
import { Badge } from "@cronicorn/ui-library/components/badge";

interface DemoTimelineProps {
  scenario: DemoScenario;
  currentStep: number;
  isRunning: boolean;
}

export function DemoTimeline({ scenario, currentStep, isRunning }: DemoTimelineProps) {
  const [animatedStep, setAnimatedStep] = useState(0);

  useEffect(() => {
    if (isRunning && animatedStep < currentStep) {
      const timer = setTimeout(() => {
        setAnimatedStep(prev => Math.min(prev + 1, currentStep));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isRunning, currentStep, animatedStep]);

  useEffect(() => {
    if (!isRunning) {
      setAnimatedStep(0);
    }
  }, [isRunning]);

  const step = scenario.steps[Math.min(animatedStep, scenario.steps.length - 1)];

  if (!isRunning) {
    return (
      <div className="flex items-center justify-center h-64 text-center text-muted-foreground">
        <div>
          <p className="mb-2">Click "Start Demo" to begin</p>
          <p className="text-sm">You'll see real-time timeline updates as the scenario progresses</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Conditions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {step?.conditions.map(condition => (
          <div
            key={condition.id}
            className={`p-3 rounded-lg border-2 transition-all duration-300 ${
              condition.status === "stable"
                ? "border-green-500/30 bg-green-500/5"
                : condition.status === "warning"
                ? "border-yellow-500/30 bg-yellow-500/5"
                : "border-red-500/30 bg-red-500/5"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {condition.label}
              </span>
              <Badge
                variant={
                  condition.status === "stable"
                    ? "default"
                    : condition.status === "warning"
                    ? "secondary"
                    : "destructive"
                }
                className="text-xs"
              >
                {condition.status}
              </Badge>
            </div>
            <div className="text-lg font-bold">{condition.value}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {condition.description}
            </div>
          </div>
        ))}
      </div>

      {/* Timeline Visualization */}
      <div className="relative">
        <div className="h-24 relative bg-muted/30 rounded-lg overflow-hidden">
          {/* Timeline Track */}
          <div className="absolute inset-0 flex items-center px-4">
            <div className="h-2 w-full bg-muted rounded-full relative overflow-hidden">
              {/* Progress */}
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{
                  width: `${((animatedStep + 1) / scenario.steps.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Execution Markers */}
          <div className="absolute inset-0 flex items-center px-4">
            <div className="w-full relative">
              {step?.executions.map((exec, idx) => (
                <div
                  key={exec.id}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{
                    left: `${(exec.time / (scenario.config?.maxTime || 20)) * 100}%`,
                  }}
                >
                  <div
                    className={`size-3 rounded-full border-2 border-background transition-all duration-300 ${
                      exec.status === "executed"
                        ? "bg-green-500"
                        : exec.status === "escalated"
                        ? "bg-yellow-500 animate-pulse"
                        : "bg-gray-400"
                    }`}
                    title={`${exec.status} at ${exec.time}min`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Caption */}
        <div className="mt-4 text-center">
          <p className="text-sm font-medium">{step?.caption}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Step {animatedStep + 1} of {scenario.steps.length}
          </p>
        </div>
      </div>

      {/* Execution Details */}
      {step?.executions && step.executions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Execution History:</p>
          <div className="space-y-1">
            {step.executions.slice(-3).reverse().map((exec) => (
              <div
                key={exec.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
              >
                <span>
                  Execution at {exec.time}min
                </span>
                <Badge variant={exec.status === "escalated" ? "secondary" : "outline"} className="text-xs">
                  {exec.interval}min interval
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
