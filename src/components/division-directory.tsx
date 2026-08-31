"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AGE_GROUPS,
  GENDERS,
  GENDER_LABEL,
  divisionDisplayName,
  type Gender,
} from "@/lib/constants";

type Division = {
  id: string;
  name: string | null;
  rating: string;
  ratingType: "single" | "combo";
  gender: Gender;
  ageGroup: string;
  teamCount: number;
};

const ALL = "all";

export function DivisionDirectory({ divisions }: { divisions: Division[] }) {
  const [gender, setGender] = useState<string>(ALL);
  const [ageGroup, setAgeGroup] = useState<string>(ALL);
  const [rating, setRating] = useState<string>(ALL);

  const ratings = useMemo(
    () =>
      [...new Set(divisions.map((d) => d.rating))].sort(
        (a, b) => Number(a) - Number(b),
      ),
    [divisions],
  );

  const filtered = divisions.filter(
    (d) =>
      (gender === ALL || d.gender === gender) &&
      (ageGroup === ALL || d.ageGroup === ageGroup) &&
      (rating === ALL || d.rating === rating),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Select value={rating} onValueChange={(v) => setRating(v ?? ALL)}>
          <SelectTrigger className="w-36" size="sm">
            <SelectValue>
              {(v) => (v === ALL ? "All ratings" : String(v))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All ratings</SelectItem>
            {ratings.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={gender} onValueChange={(v) => setGender(v ?? ALL)}>
          <SelectTrigger className="w-36" size="sm">
            <SelectValue>
              {(v) =>
                v === ALL ? "All genders" : GENDER_LABEL[v as Gender]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All genders</SelectItem>
            {GENDERS.map((g) => (
              <SelectItem key={g} value={g}>
                {GENDER_LABEL[g]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ageGroup} onValueChange={(v) => setAgeGroup(v ?? ALL)}>
          <SelectTrigger className="w-40" size="sm">
            <SelectValue>
              {(v) => (v === ALL ? "All ages" : String(v))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All ages</SelectItem>
            {AGE_GROUPS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No divisions match those filters.
        </p>
      ) : (
        <div className="flex flex-col divide-y">
          <div className="-mx-2 grid grid-cols-[2fr_1.25fr_0.75fr] items-center gap-4 px-2 pb-2 text-xs font-medium text-muted-foreground">
            <span>Division</span>
            <span>Age group</span>
            <span>Teams</span>
          </div>
          {filtered.map((d) => (
            <div
              key={d.id}
              className="relative -mx-2 grid grid-cols-[2fr_1.25fr_0.75fr] items-center gap-4 px-2 py-3 transition-colors hover:bg-muted/50"
            >
              <Link
                href={`/divisions/${d.id}`}
                className="min-w-0 truncate font-medium after:absolute after:inset-0"
              >
                {divisionDisplayName(d)}
              </Link>
              <span className="min-w-0 truncate text-sm text-muted-foreground">
                {d.ageGroup}
              </span>
              <span className="text-sm text-muted-foreground">
                {d.teamCount}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
