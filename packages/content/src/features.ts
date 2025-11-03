/**
 * Features
 * Product features and capabilities
 */

export type Feature = {
  title: string;
  description: string;
  details?: string[];
};

export const features = {
  /** Core platform features */
  core: [
    {
      title: "Adaptive Intervals",
      description: "Automatically adjust monitoring frequency based on system health—tight checks when it matters, relaxed intervals when things are calm.",
      details: [
        "Tighten during incidents (5min → 30sec)",
        "Relax during stable periods",
        "Set min/max boundaries AI respects"
      ]
    },
    {
      title: "Workflow Orchestration",
      description: "Coordinate multi-tier responses: health → investigation → recovery → alert.",
      details: [
        "Health checks detect issues",
        "Investigation tools activate automatically",
        "Recovery attempts before escalation",
        "Smart alerts only when needed"
      ]
    },
    {
      title: "Auto-Recovery",
      description: "Attempt fixes before waking the team. Cache warming, pod restarts, connection resets—all tried automatically.",
      details: [
        "Common fixes attempted first",
        "Faster resolution times",
        "Fewer interruptions",
        "Clear recovery logs"
      ]
    },
    {
      title: "Transparent AI",
      description: "Every decision explained. No black boxes. Know exactly why the scheduler made each adjustment.",
      details: [
        "Clear reasoning for all changes",
        "TTL on AI hints",
        "Manual overrides always available",
        "Audit trail of all decisions"
      ]
    }
  ],

  /** Quick feature highlights for homepage */
  highlights: [
    {
      title: "Intelligent, Not Just Scheduled",
      description: "Adapts to reality. Stop treating every moment the same."
    },
    {
      title: "Reduced Operational Costs",
      description: "Fewer false alarms, less manual work, optimized monitoring"
    },
    {
      title: "Faster Resolution",
      description: "Detect problems earlier, identify root causes automatically"
    }
  ]
} as const;
