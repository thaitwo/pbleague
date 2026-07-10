export const SKILL_LEVELS = ["2.5", "3.0", "3.5", "4.0", "4.5", "5.0"] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];
