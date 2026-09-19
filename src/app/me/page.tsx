import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { AUDIENCE_LABELS } from "@/lib/audience";
import { isProvisionalUsername } from "@/lib/validation";

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: settings }, following, followers, visits] = await Promise.all([
    supabase.from("profiles").select("username, display_name, bio").eq("id", user.id).single(),
    supabase.from("profile_settings").select("default_audience, default_pools_publicly").eq("user_id", user.id).maybeSingle(),
    supabase.from("follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", user.id),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", user.id),
    supabase.from("visits").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  if (!profile) redirect("/auth/login");
  if (isProvisionalUsername(profile.username)) redirect("/me/edit?welcome=1");

  const audience = settings?.default_audience ?? "followers";
  const pools = settings?.default_pools_publicly ?? true;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name || `@${profile.username}`}</h1>
          {profile.display_name && <p className="text-sm text-neutral-500">@{profile.username}</p>}
        </div>
        <Link href="/me/edit" className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium">
          Editar perfil
        </Link>
      </div>
      {profile.bio && <p className="mt-3 text-sm text-neutral-700">{profile.bio}</p>}

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <Link href="/people?tab=following" className="rounded-xl border border-neutral-200 p-3">
          <div className="text-xl font-bold">{following.count ?? 0}</div>
          <div className="text-xs text-neutral-500">Siguiendo</div>
        </Link>
        <Link href="/people?tab=followers" className="rounded-xl border border-neutral-200 p-3">
          <div className="text-xl font-bold">{followers.count ?? 0}</div>
          <div className="text-xs text-neutral-500">Seguidores</div>
        </Link>
        <Link href="/visits/mine" className="rounded-xl border border-neutral-200 p-3">
          <div className="text-xl font-bold">{visits.count ?? 0}</div>
          <div className="text-xs text-neutral-500">Visitas</div>
        </Link>
      </div>

      <div className="mt-5 rounded-xl bg-neutral-50 px-4 py-3 text-sm">
        <div className="font-medium">Privacidad de tus reseñas nuevas</div>
        <p className="mt-1 text-neutral-600">
          Las ve: {AUDIENCE_LABELS[audience].toLowerCase()}.{" "}
          {pools ? "Tu nota cuenta en la media general del sitio, sin tu nombre." : "No cuentan en la media general."}
        </p>
        <Link href="/me/edit" className="mt-1 inline-block text-xs text-blue-600">
          Cambiar
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Link href="/visits/mine" className="rounded-lg border border-neutral-200 px-4 py-3 text-sm font-medium">
          Mis visitas →
        </Link>
        <form action={signOut}>
          <button className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-left text-sm text-neutral-500">
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
