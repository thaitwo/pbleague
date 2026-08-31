import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ProfileForm } from "@/components/profile-form";
import { auth } from "@/lib/auth";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  const { user } = session;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <ProfileForm
        initial={{
          name: user.name,
          skillLevel: user.skillLevel ?? "",
          phone: user.phone ?? "",
        }}
        email={user.email}
      />
      <ChangePasswordForm />
    </div>
  );
}
