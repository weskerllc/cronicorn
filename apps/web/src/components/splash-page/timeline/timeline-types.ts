export type TimelineCondition = {
  id: string;
  label: string;
  value: string;
  status: "stable" | "warning" | "critical";
  description?: string;
};

export type TimelineExecution = {
  id: string;
  time: number;
  status: "executed" | "skipped" | "escalated" | "scheduled";
  interval: number;
  metadata?: Record<string, any>;
};

export type TimelineStep = {
  id: string;
  timestamp: number;
  conditions: Array<TimelineCondition>;
  executions: Array<TimelineExecution>;
  caption: string;
  metadata?: Record<string, any>;
};

export type TimelineScenario = {
  id: string;
  name: string;
  description: string;
  steps: Array<TimelineStep>;
  config: TimelineConfig;
};

export type TimelineConfig = {
  maxTime: number;
  stepDuration: number;
  autoPlay: boolean;
  loop: boolean;
  showCurrentTime: boolean;
  compactMode?: boolean;
};

export type TimelineTheme = {
  stable: {
    dot: string;
    bg: string;
    border: string;
    text: string;
  };
  warning: {
    dot: string;
    bg: string;
    border: string;
    text: string;
  };
  critical: {
    dot: string;
    bg: string;
    border: string;
    text: string;
  };
  execution: {
    executed: string;
    escalated: string;
    skipped: string;
    scheduled: string;
  };
};
