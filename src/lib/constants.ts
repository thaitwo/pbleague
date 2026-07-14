export const SKILL_LEVELS = ["2.5", "3.0", "3.5", "4.0", "4.5", "5.0"] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

// Listed alphabetically.
export const AREAS = [
  "Diablo North",
  "Diablo South",
  "East Bay",
  "Lower Peninsula",
  "Mid Peninsula",
  "San Francisco",
  "South Bay",
  "Upper Peninsula",
] as const;

export type Area = (typeof AREAS)[number];
