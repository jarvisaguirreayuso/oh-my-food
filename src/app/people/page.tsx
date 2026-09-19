import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FollowButton } from "@/components/FollowButton";

type Person = { id: string; username: string; display_name: string | null; bio: string | null };

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const { q: rawQ, tab: rawTab } = await searchParams;
  const tab = rawTab === "followers" ? "followers" : "following";
  // Keep the term to plain characters: it goes into a PostgREST filter expression.
  const q = (rawQ ?? "").replace(/[^\p{L}\p{N}_ .-]/gu, "").trim().slice(0, 40);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: followingRows }, { data: followerRows }] = await Promise.all([
    supabase.from("follows").select("followee_id").eq("follower_id", user.id),
    supabase.from("follows").select("follower_id").eq("followee_id", user.id),
  ]);
  const followingIds = new Set(followingRows?.map((r) => r.followee_id) ?? []);
  const followerIds = new Set(followerRows?.map((r) => r.follower_id) ?? []);

  let people: Person[] = [];
  if (q) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio")
      .or(`username.ilike.${q}%,display_name.ilike.%${q}%`)
      .neq("id", user.id)
      .limit(20);
    people = data ?? [];
  } else {
    const ids = [...(tab === "followers" ? followerIds : followingIds)];
    if (ids.length > 0) {
      const { data } = await supabase.from("profiles").select("id, username, display_name, bio").in("id", ids);
      people = data ?? [];
    }
  }

  const tabClass = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm ${active ? "bg-neutral-900 text-white" : "bg-neutral-100"}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <form className="mb-5 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar gente por nombre de usuario…"
          autoCapitalize="none"
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none focus:border-neutral-900"
        />
        <button className="rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white">Buscar</button>
      </form>

      {q ? (
        <h1 className="mb-3 text-sm font-semibold">Resultados para “{q}”</h1>
      ) : (
        <div className="mb-3 flex gap-2">
          <Link href="/people?tab=following" className={tabClass(tab === "following")}>
            Siguiendo ({followingIds.size})
          </Link>
          <Link href="/people?tab=followers" className={tabClass(tab === "followers")}>
            Seguidores ({followerIds.size})
          </Link>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {people.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3">
            <Link href={`/u/${p.username}`} className="min-w-0">
              <div className="truncate font-medium">{p.display_name || `@${p.username}`}</div>
              <div className="truncate text-sm text-neutral-500">
                {p.display_name ? `@${p.username}` : (p.bio ?? "")}
                {followerIds.has(p.id) && followingIds.has(p.id) ? " · amigos" : followerIds.has(p.id) ? " · te sigue" : ""}
              </div>
            </Link>
            <FollowButton userId={p.id} following={followingIds.has(p.id)} />
          </li>
        ))}
        {people.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-400">
            {q
              ? "No hay nadie con ese nombre."
              : tab === "followers"
                ? "Todavía no te sigue nadie."
                : "Todavía no sigues a nadie. Busca a alguien por su nombre de usuario."}
          </p>
        )}
      </ul>
    </div>
  );
}
