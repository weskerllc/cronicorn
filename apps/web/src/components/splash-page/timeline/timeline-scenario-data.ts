import type { TimelineScenario } from "./timeline-types";

export const monitoringScenarios: Array<TimelineScenario> = [
  {
    id: "system-monitoring",
    name: "System Monitoring",
    description: "Increases check frequency during error spikes, then backs off when stable",
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
    id: "repo-maintenance",
    name: "Repo Maintenance",
    description: "Escalates PR cleanup during inactivity or backlog growth",
    config: {
      maxTime: 30,
      stepDuration: 2000,
      autoPlay: true,
      loop: true,
      showCurrentTime: true,
      compactMode: true,
    },
    steps: [
      {
        id: "repo-step-1",
        timestamp: 0,
        conditions: [
          { id: "open-prs", label: "Open PRs", value: "5", status: "stable", description: "Healthy backlog" },
          { id: "last-review", label: "Last Review", value: "1d ago", status: "stable", description: "Recent activity" },
          { id: "stale-prs", label: "Stale PRs", value: "1", status: "stable", description: "Minimal stale work" },
        ],
        executions: [{ id: "1", time: 0, status: "executed", interval: 15 }],
        caption: "Backlog under control — regular PR cleanup cycle",
      },
      {
        id: "repo-step-2",
        timestamp: 15,
        conditions: [
          { id: "open-prs", label: "Open PRs", value: "11", status: "warning", description: "Backlog growing" },
          { id: "last-review", label: "Last Review", value: "3d ago", status: "warning", description: "Inactivity" },
          { id: "stale-prs", label: "Stale PRs", value: "4", status: "warning", description: "Needs cleanup" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 15 },
          { id: "2", time: 15, status: "escalated", interval: 5 },
        ],
        caption: "Inactivity detected — increasing PR check frequency",
      },
      {
        id: "repo-step-3",
        timestamp: 20,
        conditions: [
          { id: "open-prs", label: "Open PRs", value: "7", status: "stable", description: "Backlog shrinking" },
          { id: "last-review", label: "Last Review", value: "1d ago", status: "stable", description: "Activity resumed" },
          { id: "stale-prs", label: "Stale PRs", value: "2", status: "stable", description: "Cleaning up" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 15 },
          { id: "2", time: 15, status: "escalated", interval: 5 },
          { id: "3", time: 20, status: "executed", interval: 15 },
        ],
        caption: "Repo cleanup in progress — resuming normal intervals",
      },
    ],
  },
  {
    id: "ml-retraining",
    name: "Model Retraining",
    description: "Retrains when accuracy drops or drift is detected",
    config: {
      maxTime: 30,
      stepDuration: 2000,
      autoPlay: true,
      loop: true,
      showCurrentTime: true,
      compactMode: true,
    },
    steps: [
      {
        id: "ml-step-1",
        timestamp: 0,
        conditions: [
          { id: "accuracy", label: "Accuracy", value: "94%", status: "stable", description: "High performance" },
          { id: "drift", label: "Drift Score", value: "0.2", status: "stable", description: "Low model drift" },
          { id: "new-data", label: "New Data", value: "3.2k", status: "stable", description: "No major updates" },
        ],
        executions: [{ id: "1", time: 0, status: "executed", interval: 20 }],
        caption: "Model healthy — scheduled retraining on long intervals",
      },
      {
        id: "ml-step-2",
        timestamp: 20,
        conditions: [
          { id: "accuracy", label: "Accuracy", value: "88%", status: "warning", description: "Degrading" },
          { id: "drift", label: "Drift Score", value: "0.7", status: "warning", description: "Notable drift" },
          { id: "new-data", label: "New Data", value: "8.9k", status: "warning", description: "Data spike" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 20 },
          { id: "2", time: 20, status: "escalated", interval: 2 },
        ],
        caption: "Drift + accuracy drop — initiating rapid retraining",
      },
      {
        id: "ml-step-3",
        timestamp: 22,
        conditions: [
          { id: "accuracy", label: "Accuracy", value: "92%", status: "stable", description: "Recovered" },
          { id: "drift", label: "Drift Score", value: "0.3", status: "stable", description: "Back in range" },
          { id: "new-data", label: "New Data", value: "9.1k", status: "stable", description: "Slight changes" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 20 },
          { id: "2", time: 20, status: "escalated", interval: 2 },
          { id: "3", time: 22, status: "executed", interval: 20 },
        ],
        caption: "Retrained successfully — back to long cycle",
      },
    ],
  },
  {
    id: "slack-reminders",
    name: "Team Reminders",
    description: "Sends when PRs are pending and team is active",
    config: {
      maxTime: 24,
      stepDuration: 1800,
      autoPlay: true,
      loop: true,
      showCurrentTime: true,
      compactMode: true,
    },
    steps: [
      {
        id: "remind-step-1",
        timestamp: 0,
        conditions: [
          { id: "pending-prs", label: "Pending PRs", value: "1", status: "stable", description: "Low review backlog" },
          { id: "team-activity", label: "Active Users", value: "3", status: "stable", description: "Team online" },
          { id: "time", label: "Time", value: "11:00am", status: "stable", description: "Reminder window" },
        ],
        executions: [{ id: "1", time: 0, status: "executed", interval: 12 }],
        caption: "Low backlog — routine reminder sent",
      },
      {
        id: "remind-step-2",
        timestamp: 12,
        conditions: [
          { id: "pending-prs", label: "Pending PRs", value: "5", status: "warning", description: "PRs stacking up" },
          { id: "team-activity", label: "Active Users", value: "0", status: "critical", description: "No one online" },
          { id: "time", label: "Time", value: "2:00pm", status: "stable", description: "Still within hours" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 12 },
          { id: "2", time: 12, status: "skipped", interval: 12 },
        ],
        caption: "No active reviewers — skipping reminder",
      },
      {
        id: "remind-step-3",
        timestamp: 24,
        conditions: [
          { id: "pending-prs", label: "Pending PRs", value: "4", status: "warning", description: "Backlog still high" },
          { id: "team-activity", label: "Active Users", value: "2", status: "stable", description: "Team rejoined" },
          { id: "time", label: "Time", value: "3:30pm", status: "stable", description: "Reminder window still open" },
        ],
        executions: [
          { id: "1", time: 0, status: "executed", interval: 12 },
          { id: "2", time: 12, status: "skipped", interval: 12 },
          { id: "3", time: 24, status: "executed", interval: 12 },
        ],
        caption: "Reminder sent — team is back online",
      },
    ],
  },

];
