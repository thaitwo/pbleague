export const SKILL_LEVELS = ["2.5", "3.0", "3.5", "4.0", "4.5", "5.0"] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

// ---------- Division facets ----------

// A division is a rating "flight" defined by rating × gender × age group.
export const RATING_TYPES = ["single", "combo"] as const;
export type RatingType = (typeof RATING_TYPES)[number];

export const GENDERS = ["mens", "womens", "mixed"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABEL: Record<Gender, string> = {
  mens: "Men's",
  womens: "Women's",
  mixed: "Mixed",
};

export const AGE_GROUPS = ["18 & Over", "40 & Over", "55 & Over"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

/** Human-readable division name derived from its facets. */
export function divisionDisplayName(d: {
  name?: string | null;
  rating: string;
  gender: Gender;
  ageGroup: string;
}): string {
  if (d.name && d.name.trim()) return d.name;
  return `${d.rating} ${GENDER_LABEL[d.gender]} ${d.ageGroup}`;
}

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
