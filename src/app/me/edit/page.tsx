import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isProvisionalUsername } from "@/lib/validation";
import { ProfileForm } from "./ProfileForm";

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("username, display_name, bio").eq("id", user.id).single(),
    supabase.from("profile_settings").select("default_audience, default_pools_publicly").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!profile) redirect("/auth/login");

  // Don't prefill the generated `user_xxxxxxxxxxxx`: make the person choose one.
  const provisional = isProvisionalUsername(profile.username);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {welcome || provisional ? (
        <div className="mb-5">
          <h1 className="font-display text-xl font-semibold">Bienvenido 👋</h1>
          <p className="mt-1 text-sm text-stone-500">Elige cómo quieres que te vea la gente.</p>
        </div>
      ) : (
        <h1 className="font-display mb-5 text-xl font-semibold">Editar perfil</h1>
      )}
      <ProfileForm
        username={provisional ? "" : profile.username}
        displayName={profile.display_name ?? ""}
        bio={profile.bio ?? ""}
        defaultAudience={settings?.default_audience ?? "followers"}
        defaultPoolsPublicly={settings?.default_pools_publicly ?? true}
      />
    </div>
  );
}
