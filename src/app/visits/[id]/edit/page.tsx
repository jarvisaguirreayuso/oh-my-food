import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditVisitForm } from "./EditVisitForm";

export default async function EditVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: visit } = await supabase
    .from("visits")
    .select(
      "id, visited_on, place_rating, place_comment, place_id, audience, pools_publicly, places(id, name), dish_reviews(id, idea, execution, flavor, would_repeat, comment, dish_id, dishes(name))"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!visit) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-display mb-4 text-xl font-semibold">Editar visita</h1>
      <EditVisitForm visit={visit} />
    </div>
  );
}
