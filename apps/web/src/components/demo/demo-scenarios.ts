export interface DemoCondition {
  id: string;
  label: string;
  value: string;
  status: "stable" | "warning" | "critical";
  description: string;
}

export interface DemoExecution {
  id: string;
  time: number;
  status: "executed" | "escalated" | "failed";
  interval: number;
}

export interface DemoStep {
  id: string;
  timestamp: number;
  conditions: DemoCondition[];
  executions: DemoExecution[];
  caption: string;
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  config: {
    maxTime: number;
    stepDuration: number;
    autoPlay: boolean;
    loop: boolean;
    showCurrentTime: boolean;
    compactMode: boolean;
  };
  steps: DemoStep[];
}

export const demoScenarios: DemoScenario[] = [
  {
    id: "ecommerce-flash-sale",
    name: "Flash Sale",
    description: "E-commerce traffic surge with automatic adaptation",
    icon: "🛒",
    config: {
      maxTime: 12,
      stepDuration: 2500,
      autoPlay: true,
      loop: true,
      showCurrentTime: true,
      compactMode: true,
    },
    steps: [
      {
        id: "flash-step-1",
        timestamp: 0,
        conditions: [
          { id: "traffic", label: "Traffic", value: "1.2k RPM", status: "stable", description: "Normal levels" },
          { id: "orders", label: "Orders", value: "45/min", status: "stable", description: "Baseline rate" },
          { id: "response", label: "Response Time", value: "120ms", status: "stable", description: "Fast responses" },
        ],
        executions: [{ id: "1", time: 0, status: "executed", interval: 5 }],
        caption: "Pre-sale baseline — monitoring every 5 minutes",
      },
      {
        id: "flash-step-2",
        timestamp: 5,
        conditions: [
          { id: "traffic", label: "Traffic", value: "6.8k RPM", status: "warning", description: "5× surge detected" },
          { id: "orders", label: "Orders", value: "210/min", status: "warning", description: "Heavy load" },
          { id: "response", label: "Response Time", value: "280ms", status: "warning", description: "Slowing down" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 5 },
          { id: "2", time: 5, status: "escalated", interval: 0.5 },
        ],
        caption: "Traffic surge detected—tightening monitoring to 30 seconds",
      },
      {
        id: "flash-step-3",
        timestamp: 5.5,
        conditions: [
          { id: "traffic", label: "Traffic", value: "8.2k RPM", status: "critical", description: "Peak load" },
          { id: "orders", label: "Orders", value: "290/min", status: "critical", description: "System stressed" },
          { id: "response", label: "Response Time", value: "450ms", status: "critical", description: "Degrading" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 5 },
          { id: "2", time: 5, status: "escalated", interval: 0.5 },
          { id: "3", time: 5.5, status: "executed", interval: 0.5 },
        ],
        caption: "Peak load—30-second monitoring + cache warming activated",
      },
      {
        id: "flash-step-4",
        timestamp: 6,
        conditions: [
          { id: "traffic", label: "Traffic", value: "4.1k RPM", status: "warning", description: "Cooling down" },
          { id: "orders", label: "Orders", value: "180/min", status: "stable", description: "Stabilizing" },
          { id: "response", label: "Response Time", value: "190ms", status: "stable", description: "Recovering" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 5 },
          { id: "2", time: 5, status: "escalated", interval: 0.5 },
          { id: "3", time: 5.5, status: "executed", interval: 0.5 },
          { id: "4", time: 6, status: "executed", interval: 2 },
        ],
        caption: "Traffic stabilizing—relaxing to 2-minute intervals",
      },
      {
        id: "flash-step-5",
        timestamp: 8,
        conditions: [
          { id: "traffic", label: "Traffic", value: "1.8k RPM", status: "stable", description: "Back to normal" },
          { id: "orders", label: "Orders", value: "65/min", status: "stable", description: "Steady state" },
          { id: "response", label: "Response Time", value: "95ms", status: "stable", description: "Optimal" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 5 },
          { id: "2", time: 5, status: "escalated", interval: 0.5 },
          { id: "3", time: 5.5, status: "executed", interval: 0.5 },
          { id: "4", time: 6, status: "executed", interval: 2 },
          { id: "5", time: 8, status: "executed", interval: 5 },
        ],
        caption: "Sale complete—resumed normal 5-minute monitoring",
      },
    ],
  },
  {
    id: "system-monitoring",
    name: "System Health",
    description: "Infrastructure monitoring with intelligent escalation",
    icon: "🖥️",
    config: {
      maxTime: 40,
      stepDuration: 2500,
      autoPlay: true,
      loop: true,
      showCurrentTime: true,
      compactMode: true,
    },
    steps: [
      {
        id: "step-1",
        timestamp: 0,
        conditions: [
          { id: "cpu", label: "CPU", value: "45%", status: "stable", description: "Normal load" },
          { id: "errors", label: "Errors", value: "0.5%", status: "stable", description: "Baseline" },
          { id: "memory", label: "Memory", value: "62%", status: "stable", description: "Healthy" },
        ],
        executions: [{ id: "1", time: 0, status: "executed", interval: 15 }],
        caption: "Normal conditions — checking every 15 minutes",
      },
      {
        id: "step-2",
        timestamp: 15,
        conditions: [
          { id: "cpu", label: "CPU", value: "78%", status: "warning", description: "Elevated load" },
          { id: "errors", label: "Errors", value: "2.8%", status: "warning", description: "Above threshold" },
          { id: "memory", label: "Memory", value: "71%", status: "stable", description: "Acceptable" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 15 },
          { id: "2", time: 15, status: "escalated", interval: 3 },
        ],
        caption: "Error spike detected — escalating to 3-minute checks",
      },
      {
        id: "step-3",
        timestamp: 18,
        conditions: [
          { id: "cpu", label: "CPU", value: "82%", status: "warning", description: "High load" },
          { id: "errors", label: "Errors", value: "2.5%", status: "warning", description: "Still elevated" },
          { id: "memory", label: "Memory", value: "75%", status: "stable", description: "Increasing" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 15 },
          { id: "2", time: 15, status: "escalated", interval: 3 },
          { id: "3", time: 18, status: "executed", interval: 3 },
        ],
        caption: "High-frequency monitoring active — system under stress",
      },
      {
        id: "step-4",
        timestamp: 21,
        conditions: [
          { id: "cpu", label: "CPU", value: "68%", status: "stable", description: "Improving" },
          { id: "errors", label: "Errors", value: "1.9%", status: "stable", description: "Declining" },
          { id: "memory", label: "Memory", value: "69%", status: "stable", description: "Stabilizing" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 15 },
          { id: "2", time: 15, status: "escalated", interval: 3 },
          { id: "3", time: 18, status: "executed", interval: 3 },
          { id: "4", time: 21, status: "executed", interval: 15 },
        ],
        caption: "System stabilizing — applying backoff to normal schedule",
      },
      {
        id: "step-5",
        timestamp: 36,
        conditions: [
          { id: "cpu", label: "CPU", value: "52%", status: "stable", description: "Normal" },
          { id: "errors", label: "Errors", value: "0.4%", status: "stable", description: "Baseline" },
          { id: "memory", label: "Memory", value: "64%", status: "stable", description: "Optimal" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 15 },
          { id: "2", time: 15, status: "escalated", interval: 3 },
          { id: "3", time: 18, status: "executed", interval: 3 },
          { id: "4", time: 21, status: "executed", interval: 15 },
          { id: "5", time: 36, status: "executed", interval: 15 },
        ],
        caption: "All systems normal — resumed 15-minute intervals",
      },
    ],
  },
  {
    id: "data-pipeline",
    name: "Data Pipeline",
    description: "ETL coordination with intelligent dependency handling",
    icon: "📊",
    config: {
      maxTime: 20,
      stepDuration: 2200,
      autoPlay: true,
      loop: true,
      showCurrentTime: true,
      compactMode: true,
    },
    steps: [
      {
        id: "pipeline-step-1",
        timestamp: 0,
        conditions: [
          { id: "extract", label: "Extract", value: "Running", status: "stable", description: "Data ingestion active" },
          { id: "transform", label: "Transform", value: "Queued", status: "stable", description: "Waiting for extract" },
          { id: "load", label: "Load", value: "Idle", status: "stable", description: "Waiting for transform" },
        ],
        executions: [{ id: "1", time: 0, status: "executed", interval: 10 }],
        caption: "Pipeline orchestration—extract stage running normally",
      },
      {
        id: "pipeline-step-2",
        timestamp: 8,
        conditions: [
          { id: "extract", label: "Extract", value: "Failed", status: "critical", description: "API timeout" },
          { id: "transform", label: "Transform", value: "Paused", status: "warning", description: "Dependency failed" },
          { id: "load", label: "Load", value: "Paused", status: "warning", description: "Downstream paused" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 10 },
          { id: "2", time: 8, status: "escalated", interval: 2 },
        ],
        caption: "Extract failed—pausing downstream + retry in 2 minutes",
      },
      {
        id: "pipeline-step-3",
        timestamp: 10,
        conditions: [
          { id: "extract", label: "Extract", value: "Retrying", status: "warning", description: "Attempt 2/3" },
          { id: "transform", label: "Transform", value: "Queued", status: "stable", description: "Ready to resume" },
          { id: "load", label: "Load", value: "Idle", status: "stable", description: "Awaiting data" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 10 },
          { id: "2", time: 8, status: "escalated", interval: 2 },
          { id: "3", time: 10, status: "executed", interval: 5 },
        ],
        caption: "Auto-retry succeeded—resuming pipeline coordination",
      },
      {
        id: "pipeline-step-4",
        timestamp: 15,
        conditions: [
          { id: "extract", label: "Extract", value: "Complete", status: "stable", description: "Data ready" },
          { id: "transform", label: "Transform", value: "Running", status: "stable", description: "Processing data" },
          { id: "load", label: "Load", value: "Queued", status: "stable", description: "Ready for load" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 10 },
          { id: "2", time: 8, status: "escalated", interval: 2 },
          { id: "3", time: 10, status: "executed", interval: 5 },
          { id: "4", time: 15, status: "executed", interval: 10 },
        ],
        caption: "Pipeline recovered—all stages coordinated automatically",
      },
    ],
  },
  {
    id: "api-monitoring",
    name: "API Health",
    description: "API SLA monitoring with proactive escalation",
    icon: "📡",
    config: {
      maxTime: 15,
      stepDuration: 1800,
      autoPlay: true,
      loop: true,
      showCurrentTime: true,
      compactMode: true,
    },
    steps: [
      {
        id: "api-step-1",
        timestamp: 0,
        conditions: [
          { id: "latency", label: "Latency", value: "45ms", status: "stable", description: "Under SLA (100ms)" },
          { id: "uptime", label: "Uptime", value: "99.98%", status: "stable", description: "Excellent" },
          { id: "errors", label: "Error Rate", value: "0.1%", status: "stable", description: "Minimal errors" },
        ],
        executions: [{ id: "1", time: 0, status: "executed", interval: 10 }],
        caption: "API healthy—standard 10-minute health checks",
      },
      {
        id: "api-step-2",
        timestamp: 10,
        conditions: [
          { id: "latency", label: "Latency", value: "185ms", status: "critical", description: "SLA breach!" },
          { id: "uptime", label: "Uptime", value: "99.85%", status: "warning", description: "Declining" },
          { id: "errors", label: "Error Rate", value: "2.3%", status: "warning", description: "Spike detected" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 10 },
          { id: "2", time: 10, status: "escalated", interval: 1 },
        ],
        caption: "SLA breach detected—escalating to 1-minute checks",
      },
      {
        id: "api-step-3",
        timestamp: 11,
        conditions: [
          { id: "latency", label: "Latency", value: "65ms", status: "stable", description: "Back under SLA" },
          { id: "uptime", label: "Uptime", value: "99.92%", status: "stable", description: "Recovering" },
          { id: "errors", label: "Error Rate", value: "0.3%", status: "stable", description: "Normal levels" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 10 },
          { id: "2", time: 10, status: "escalated", interval: 1 },
          { id: "3", time: 11, status: "executed", interval: 10 },
        ],
        caption: "API recovered—resuming standard monitoring intervals",
      },
    ],
  },
];
