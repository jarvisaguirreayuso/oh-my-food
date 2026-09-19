import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlaceGeneralScores } from "@/lib/places";
import { isProvisionalUsername } from "@/lib/validation";
import { PlaceList } from "@/components/PlaceList";
import { VisitCard } from "@/components/VisitCard";
import { Chip } from "@/components/ui/Chip";
import { Stars } from "@/components/ui/Stars";
import { getRecommendations } from "@/lib/recommendations";
import { TYPE_LABELS } from "@/lib/places";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "para-ti" ? "para-ti" : "siguiendo";
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

  const recommendations = tab === "para-ti" ? await getRecommendations(supabase, user.id, followeeIds) : [];

  // RLS already limits this to visits whose author let us see them.
  const { data: visits } = tab === "siguiendo" && followeeIds.length
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
      <form action="/explore" className="mb-5 flex gap-2">
        <input
          type="search"
          name="q"
          placeholder="Buscar sitios…"
          className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-base outline-none focus:border-accent"
        />
        <button className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white">Buscar</button>
      </form>

      <div className="mb-4 flex gap-2">
        {[
          { key: "siguiendo", label: "Siguiendo", href: "/" },
          { key: "para-ti", label: "Para ti", href: "/?tab=para-ti" },
        ].map((t) => (
          <Chip key={t.key} href={t.href} active={tab === t.key}>
            {t.label}
          </Chip>
        ))}
      </div>

      {tab === "para-ti" ? (
        recommendations.length > 0 ? (
          <>
            <p className="mb-3 text-sm text-stone-500">
              Sitios bien valorados por la gente que sigues y que aún no has visitado ni guardado.
            </p>
            <ul className="flex flex-col gap-2">
              {recommendations.map((r) => (
                <li key={r.place.id}>
                  <Link
                    href={`/places/${r.place.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-4 py-3 hover:border-stone-400"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.place.name}</div>
                      <div className="truncate text-sm text-stone-500">
                        {TYPE_LABELS[r.place.type] ?? r.place.type}
                        {r.place.address ? ` · ${r.place.address}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Stars value={r.avg} />
                      <div className="text-xs text-stone-400">
                        {r.people} {r.people === 1 ? "persona" : "personas"} que sigues
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
            {followeeIds.length === 0
              ? "Sigue a gente para recibir recomendaciones."
              : "Todavía no hay sitios nuevos bien valorados por quien sigues."}
          </p>
        )
      ) : followeeIds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center">
          <p className="font-medium">Todavía no sigues a nadie</p>
          <p className="mt-1 text-sm text-stone-500">
            Sigue a otra gente para ver aquí dónde comen y qué opinan.
          </p>
          <Link
            href="/people"
            className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
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
        <p className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
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
      <h1 className="font-display text-3xl font-bold leading-tight">Dónde comes y cómo evoluciona.</h1>
      <p className="mt-3 text-stone-600">
        Puntúa sitios y platos, sigue a tu gente y mira cómo cambia la calidad con el tiempo.
      </p>
      <div className="mt-5 flex gap-3">
        <Link href="/auth/login" className="rounded-lg bg-accent px-5 py-3 font-medium text-white">
          Entrar
        </Link>
        <Link href="/explore" className="rounded-lg border border-stone-300 px-5 py-3 font-medium">
          Ver sitios
        </Link>
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Sitios recientes
      </h2>
      <PlaceList places={places} scores={scores} emptyMessage="Todavía no hay sitios." />
    </div>
  );
}
