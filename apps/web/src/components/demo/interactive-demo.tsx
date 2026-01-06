import { useState, useCallback } from "react";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@cronicorn/ui-library/components/tabs";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { PlayCircle, RotateCcw, Zap, AlertCircle, CheckCircle2 } from "lucide-react";
import { DemoTimeline } from "./demo-timeline";
import { AIDecisionLog } from "./ai-decision-log";
import { type DemoScenario, demoScenarios } from "./demo-scenarios";
import { scenarioBenefits } from "../splash-page/timeline/timeline-scenario-data";

export function InteractiveDemo() {
  const [selectedScenario, setSelectedScenario] = useState<string>("ecommerce-flash-sale");
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [decisions, setDecisions] = useState<Array<{
    id: string;
    timestamp: number;
    message: string;
    type: "info" | "warning" | "critical" | "success";
  }>>([]);

  const scenario = demoScenarios.find(s => s.id === selectedScenario);

  const handleStart = useCallback(() => {
    setIsRunning(true);
    setCurrentStep(0);
    setDecisions([{
      id: "start",
      timestamp: Date.now(),
      message: "Demo started - monitoring baseline conditions",
      type: "info"
    }]);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setCurrentStep(0);
    setDecisions([]);
  }, []);

  const handleSimulate = useCallback((eventType: "surge" | "failure" | "recovery") => {
    const timestamp = Date.now();

    switch (eventType) {
      case "surge":
        setDecisions(prev => [...prev, {
          id: `surge-${timestamp}`,
          timestamp,
          message: "Traffic surge detected (+400%) → Tightening monitoring interval from 5 minutes to 30 seconds",
          type: "warning"
        }]);
        setCurrentStep(prev => Math.min(prev + 1, (scenario?.steps.length || 1) - 1));
        break;
      case "failure":
        setDecisions(prev => [...prev, {
          id: `failure-${timestamp}`,
          timestamp,
          message: "Service degradation detected → Escalating checks and activating diagnostic endpoints",
          type: "critical"
        }]);
        setCurrentStep(prev => Math.min(prev + 2, (scenario?.steps.length || 1) - 1));
        break;
      case "recovery":
        setDecisions(prev => [...prev, {
          id: `recovery-${timestamp}`,
          timestamp,
          message: "System stabilizing → Gradually relaxing back to baseline intervals",
          type: "success"
        }]);
        setCurrentStep(prev => Math.min(prev + 1, (scenario?.steps.length || 1) - 1));
        break;
    }
  }, [scenario]);

  if (!scenario) {
    return <div>Scenario not found</div>;
  }

  const benefits = scenarioBenefits[selectedScenario] || [];

  return (
    <div className="space-y-6">
      {/* Scenario Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Choose a Scenario</CardTitle>
          <CardDescription>
            Select an industry-specific demo to see how Cronicorn adapts to real-world conditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedScenario} onValueChange={setSelectedScenario}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              {demoScenarios.map(s => (
                <TabsTrigger key={s.id} value={s.id} className="text-xs lg:text-sm">
                  {s.icon} <span className="ml-2 hidden sm:inline">{s.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold text-sm mb-2">{scenario.name}</h4>
            <p className="text-sm text-muted-foreground mb-3">{scenario.description}</p>

            {benefits.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">What Cronicorn Automated:</p>
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="size-3 mt-0.5 text-green-500 shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Demo Controls and Visualization */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timeline Visualization */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Live Timeline</CardTitle>
                  <CardDescription>
                    Watch executions and AI adaptations in real-time
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {!isRunning ? (
                    <Button onClick={handleStart} size="sm">
                      <PlayCircle className="size-4 mr-2" />
                      Start Demo
                    </Button>
                  ) : (
                    <Button onClick={handleReset} variant="outline" size="sm">
                      <RotateCcw className="size-4 mr-2" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DemoTimeline
                scenario={scenario}
                currentStep={currentStep}
                isRunning={isRunning}
              />
            </CardContent>
          </Card>
        </div>

        {/* Simulation Controls */}
        <div className="space-y-6">
          {/* Controls Card */}
          <Card>
            <CardHeader>
              <CardTitle>Simulation Controls</CardTitle>
              <CardDescription>
                Trigger events to see how AI responds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => handleSimulate("surge")}
                disabled={!isRunning}
                className="w-full"
                variant="outline"
              >
                <Zap className="size-4 mr-2" />
                Simulate Traffic Surge
              </Button>
              <Button
                onClick={() => handleSimulate("failure")}
                disabled={!isRunning}
                className="w-full"
                variant="outline"
              >
                <AlertCircle className="size-4 mr-2" />
                Simulate Service Failure
              </Button>
              <Button
                onClick={() => handleSimulate("recovery")}
                disabled={!isRunning}
                className="w-full"
                variant="outline"
              >
                <CheckCircle2 className="size-4 mr-2" />
                Simulate Recovery
              </Button>

              {!isRunning && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Click "Start Demo" to enable controls
                </p>
              )}
            </CardContent>
          </Card>

          {/* AI Decision Log */}
          <AIDecisionLog decisions={decisions} />
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Zap className="size-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">
                Every Decision Explained
              </h4>
              <p className="text-sm text-muted-foreground">
                Unlike black-box schedulers, Cronicorn shows you exactly why each adjustment was made.
                All decisions are auditable and respect your configured constraints.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
