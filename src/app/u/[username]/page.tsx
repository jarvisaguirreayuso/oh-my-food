import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FollowButton } from "@/components/FollowButton";
import { VisitCard } from "@/components/VisitCard";
import Link from "next/link";

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) notFound();

  const isMe = profile.id === user.id;

  const [iFollow, followsMe, { data: visits }] = await Promise.all([
    supabase.from("follows").select("followee_id").eq("follower_id", user.id).eq("followee_id", profile.id).maybeSingle(),
    supabase.from("follows").select("follower_id").eq("follower_id", profile.id).eq("followee_id", user.id).maybeSingle(),
    // Only the visits this person lets us see come back; RLS does the filtering.
    supabase
      .from("visits")
      .select(
        "id, visited_on, place_rating, place_comment, audience, places(id, name), dish_reviews(id, idea, execution, flavor, would_repeat, dishes(name))"
      )
      .eq("user_id", profile.id)
      .order("visited_on", { ascending: false })
      .limit(30),
  ]);
  const following = Boolean(iFollow.data);
  const mutual = following && Boolean(followsMe.data);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name || `@${profile.username}`}</h1>
          {profile.display_name && <p className="text-sm text-neutral-500">@{profile.username}</p>}
          {!isMe && (followsMe.data || mutual) && (
            <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
              {mutual ? "Amigos (os seguís)" : "Te sigue"}
            </span>
          )}
        </div>
        {isMe ? (
          <Link href="/me/edit" className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium">
            Editar perfil
          </Link>
        ) : (
          <FollowButton userId={profile.id} following={following} />
        )}
      </div>
      {profile.bio && <p className="mt-3 text-sm text-neutral-700">{profile.bio}</p>}

      <h2 className="mb-2 mt-8 text-sm font-semibold">Visitas</h2>
      {visits && visits.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {visits.map((v) => (
            <VisitCard key={v.id} visit={v} showAudience={isMe} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          {isMe
            ? "Todavía no has registrado visitas."
            : following
              ? "No hay visitas que puedas ver de esta persona."
              : "No ves ninguna visita de esta persona. Puede que las comparta solo con quien la sigue."}
        </p>
      )}
    </div>
  );
}
