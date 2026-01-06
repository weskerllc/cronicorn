import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Brain, Info, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { useEffect, useRef } from "react";

interface Decision {
  id: string;
  timestamp: number;
  message: string;
  type: "info" | "warning" | "critical" | "success";
}

interface AIDecisionLogProps {
  decisions: Decision[];
}

export function AIDecisionLog({ decisions }: AIDecisionLogProps) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [decisions]);

  const getIcon = (type: Decision["type"]) => {
    switch (type) {
      case "info":
        return <Info className="size-4 text-blue-500" />;
      case "warning":
        return <AlertTriangle className="size-4 text-yellow-500" />;
      case "critical":
        return <XCircle className="size-4 text-red-500" />;
      case "success":
        return <CheckCircle className="size-4 text-green-500" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="size-5 text-primary" />
          <CardTitle>AI Decision Log</CardTitle>
        </div>
        <CardDescription>
          Real-time AI reasoning and adaptations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          ref={logRef}
          className="space-y-2 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
        >
          {decisions.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Brain className="size-8 mx-auto mb-2 opacity-30" />
              <p>No decisions yet</p>
              <p className="text-xs mt-1">Start the demo to see AI reasoning</p>
            </div>
          ) : (
            decisions.map((decision) => (
              <div
                key={decision.id}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border/50 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <div className="mt-0.5 shrink-0">{getIcon(decision.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed break-words">
                    {decision.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(decision.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
