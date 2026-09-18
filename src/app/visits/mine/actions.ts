"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteVisit(visitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("visits").delete().eq("id", visitId);
  if (error) return { error: error.message };

  revalidatePath("/visits/mine");
  return { error: null };
}
