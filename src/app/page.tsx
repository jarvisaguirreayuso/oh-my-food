import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlaceGeneralScores } from "@/lib/places";
import { isProvisionalUsername } from "@/lib/validation";
import { PlaceList } from "@/components/PlaceList";
import { VisitCard } from "@/components/VisitCard";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <Landing />;

  // First login: ask for a real username before anything else.
  const { data: me } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  if (me && isProvisionalUsername(me.username)) redirect("/me/edit?welcome=1");

  const { data: follows } = await supabase.from("follows").select("followee_id").eq("follower_id", user.id);
  const followeeIds = follows?.map((f) => f.followee_id) ?? [];

  // RLS already limits this to visits whose author let us see them.
  const { data: visits } = followeeIds.length
    ? await supabase
        .from("visits")
        .select(
          "id, visited_on, place_rating, place_comment, audience, places(id, name), profiles(username, display_name), dish_reviews(id, idea, execution, flavor, would_repeat, dishes(name))"
        )
        .in("user_id", followeeIds)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold">Siguiendo</h1>

      {followeeIds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center">
          <p className="font-medium">Todavía no sigues a nadie</p>
          <p className="mt-1 text-sm text-neutral-500">
            Sigue a otra gente para ver aquí dónde comen y qué opinan.
          </p>
          <Link
            href="/people"
            className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Buscar gente
          </Link>
        </div>
      ) : visits && visits.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {visits.map((v) => (
            <VisitCard key={v.id} visit={v} showAuthor />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          Las personas que sigues aún no han compartido ninguna visita contigo.
        </p>
      )}
    </div>
  );
}

async function Landing() {
  const supabase = await createClient();
  const { data: places } = await supabase
    .from("places")
    .select("id, name, type, address")
    .order("created_at", { ascending: false })
    .limit(10);
  const scores = await getPlaceGeneralScores(supabase, places?.map((p) => p.id) ?? []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold leading-tight">Dónde comes y cómo evoluciona.</h1>
      <p className="mt-3 text-neutral-600">
        Puntúa sitios y platos, sigue a tu gente y mira cómo cambia la calidad con el tiempo.
      </p>
      <div className="mt-5 flex gap-3">
        <Link href="/auth/login" className="rounded-lg bg-neutral-900 px-5 py-3 font-medium text-white">
          Entrar
        </Link>
        <Link href="/explore" className="rounded-lg border border-neutral-300 px-5 py-3 font-medium">
          Ver sitios
        </Link>
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Sitios recientes
      </h2>
      <PlaceList places={places} scores={scores} emptyMessage="Todavía no hay sitios." />
    </div>
  );
}
