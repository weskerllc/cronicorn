import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { CheckCircle2, Copy, Terminal } from "lucide-react";
import { Button } from "@cronicorn/ui-library/components/button";
import { useState } from "react";

export function QuickStartTutorial() {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const handleCopy = (code: string, stepNumber: number) => {
    navigator.clipboard.writeText(code);
    setCopiedStep(stepNumber);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const steps = [
    {
      number: 1,
      title: "Create Your First Job",
      duration: "30 seconds",
      code: `curl -X POST https://api.cronicorn.com/v1/jobs \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "name": "My Health Monitor",
    "description": "Monitor my API health"
  }'`,
      result: "✅ Job created with ID `job_abc123`",
    },
    {
      number: 2,
      title: "Add an Endpoint",
      duration: "45 seconds",
      code: `curl -X POST https://api.cronicorn.com/v1/jobs/job_abc123/endpoints \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "name": "API Health Check",
    "url": "https://your-api.com/health",
    "method": "GET",
    "schedule": {
      "type": "interval",
      "value": 300000
    }
  }'`,
      result: "✅ Endpoint scheduled, first execution in 5 minutes",
    },
    {
      number: 3,
      title: "Watch It Run",
      duration: "3 minutes",
      description: [
        "Open your dashboard to see the first execution complete",
        "View detailed execution logs and response data",
        "Enable AI adaptation with a simple toggle",
        "Simulate a failure to watch AI respond",
      ],
      result: "✅ Complete workflow from API to execution to AI adaptation",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold">Get Started in 3 Steps</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          See value in less than 5 minutes. No credit card required.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {steps.map((step) => (
          <Card key={step.number} className="relative overflow-hidden">
            {/* Step Number Badge */}
            <div className="absolute top-4 right-4">
              <Badge variant="secondary" className="size-8 flex items-center justify-center rounded-full p-0">
                {step.number}
              </Badge>
            </div>

            <CardHeader>
              <CardTitle className="text-lg pr-10">{step.title}</CardTitle>
              <CardDescription>{step.duration}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Code Block */}
              {step.code && (
                <div className="relative">
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs overflow-x-auto border border-border">
                    <pre className="text-foreground/90">{step.code}</pre>
                  </div>
                  <Button
                    onClick={() => handleCopy(step.code, step.number)}
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 size-8 p-0"
                  >
                    {copiedStep === step.number ? (
                      <CheckCircle2 className="size-4 text-green-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              )}

              {/* Description List */}
              {step.description && (
                <ul className="space-y-2">
                  {step.description.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Terminal className="size-4 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Result */}
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground">{step.result}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MCP Server Callout */}
      <Card className="border-purple-500/30 bg-purple-500/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Terminal className="size-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                Prefer AI-native workflow?
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                  Recommended
                </Badge>
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Install the Cronicorn MCP Server and manage jobs through natural conversation with your AI assistant.
              </p>
              <div className="flex gap-3">
                <Button asChild variant="outline" size="sm">
                  <a href="/docs/mcp-server">Learn More</a>
                </Button>
                <div className="flex-1 bg-muted/50 rounded-lg p-2 font-mono text-xs flex items-center justify-between">
                  <code>npm install -g @cronicorn/mcp-server</code>
                  <Button
                    onClick={() => handleCopy("npm install -g @cronicorn/mcp-server", 99)}
                    size="sm"
                    variant="ghost"
                    className="size-6 p-0 ml-2"
                  >
                    {copiedStep === 99 ? (
                      <CheckCircle2 className="size-3 text-green-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
