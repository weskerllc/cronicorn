/**
 * Section headings and descriptions for marketing pages
 * Used for consistent section titles across the site
 */

export const sections = {
  quickAnswers: {
    heading: "Quick Answers",
    description: "Everything you need to know about intelligent job scheduling",
  },
} as const;

export type Sections = typeof sections;
