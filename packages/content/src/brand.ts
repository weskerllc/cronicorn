/**
 * Core Brand Identity and Messaging
 * Single source of truth for all brand content
 */

export const brand = {
  /** Core site information */
  name: "Cronicorn",
  tagline: "Intelligent job scheduling that adapts to your reality",
  logoAlt: "Cronicorn Logo",

  /** Headlines and messaging used throughout marketing pages */
  headlines: {
    hero: {
      primary: "Never Miss the Perfect Moment to Run Your Code",
      secondary: "Adaptive job scheduling that automatically adjusts to real-time system conditions",
      emotional: "Stop getting paged at 3 AM for issues that fix themselves",
    },
    problemSolution: {
      problem: "Your Systems Don't Run in a Vacuum",
      solution: "Intelligent Scheduling in 4 Steps",
      benefit: "Adaptive automation for modern operations",
    },
  },

  /** One-line descriptions for various contexts */
  oneLiners: {
    primary: "Never Miss the Perfect Moment to Run Your Code",
    alternatives: [
      "Your Jobs Deserve a Smarter Scheduler",
      "Stop Fighting Your Scheduler",
      "Adaptive automation for modern operations",
    ],
  },

  /** Elevator pitch (30 seconds) */
  elevatorPitch: "Cronicorn is an AI-powered job scheduler that automatically adapts to your system's reality. Instead of checking everything at the same pace regardless of what's happening, it tightens monitoring during incidents, activates investigation tools, attempts recovery, and only alerts when human intervention is truly needed. Teams reduce alert fatigue by 80% and resolve issues 10x faster.",

  /** Short description for meta tags */
  description: "AI-powered HTTP job scheduler that automatically adapts to real-time conditions—tightening monitoring during incidents and relaxing during recovery. Reduce alert fatigue, speed up recovery, and sleep better.",

  /** Value propositions (primary benefits) */
  valueProps: [
    {
      title: "Reduce Alert Fatigue 80%",
      description: "Smart escalation, not notification spam",
      detail: "Context-aware alerts only when needed",
    },
    {
      title: "10x Faster Issue Resolution",
      description: "Detect problems earlier with adaptive intervals",
      detail: "Auto-recovery before human intervention",
    },
    {
      title: "Zero Schedule Maintenance",
      description: "Set baselines once, AI handles all adjustments automatically",
      detail: "No manual schedule tweaking required",
    },
  ],

  /** Key statistics to highlight */
  stats: {
    alertReduction: "80%",
    resolutionSpeed: "10x",
    costReduction: "40%",
    pagesEliminated: "3 AM pages",
  },
} as const;
