"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { SKILL_LEVELS } from "@/lib/constants";

type ProfileFormProps = {
  initial: {
    name: string;
    skillLevel: string;
    phone: string;
  };
  email: string;
};

export function ProfileForm({ initial, email }: ProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(initial.name);
  const [skillLevel, setSkillLevel] = useState(initial.skillLevel);
  const [phone, setPhone] = useState(initial.phone);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.updateUser({
      name,
      skillLevel: skillLevel || undefined,
      phone: phone || undefined,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Could not save your profile.");
      return;
    }
    toast.success("Profile saved.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your profile</CardTitle>
        <CardDescription>
          This is how you appear to captains and teammates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Email</Label>
            <Input value={email} disabled />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Skill level</Label>
            <Select
              value={skillLevel}
              onValueChange={(v) => setSkillLevel(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your rating" />
              </SelectTrigger>
              <SelectContent>
                {SKILL_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Visible to teammates only"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
