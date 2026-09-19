"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ListState = { status: "idle" | "error"; message?: string };

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  return { supabase, user };
}

const id = (formData: FormData, key: string) => {
  const parsed = z.guid().safeParse(formData.get(key));
  return parsed.success ? parsed.data : null;
};

export async function toggleSaved(formData: FormData) {
  const { supabase, user } = await signedIn();
  const placeId = id(formData, "placeId");
  if (!placeId) return;

  if (formData.get("saved") === "true") {
    await supabase.from("saved_places").delete().eq("user_id", user.id).eq("place_id", placeId);
  } else {
    await supabase.from("saved_places").insert({ user_id: user.id, place_id: placeId });
  }
  revalidatePath("/", "layout");
}

const listNameSchema = z.string().trim().min(1, "Ponle un nombre a la lista").max(60, "Máximo 60 caracteres");

export async function createList(_prev: ListState, formData: FormData): Promise<ListState> {
  const { supabase, user } = await signedIn();
  const name = listNameSchema.safeParse(formData.get("name"));
  if (!name.success) return { status: "error", message: name.error.issues[0]?.message ?? "Nombre inválido" };

  const { data, error } = await supabase
    .from("place_lists")
    .insert({ owner_id: user.id, name: name.data })
    .select("id")
    .single();
  if (error || !data) {
    return {
      status: "error",
      message: error?.code === "23505" ? "Ya tienes una lista con ese nombre" : (error?.message ?? "No se pudo crear la lista"),
    };
  }
  redirect(`/lists/${data.id}`);
}

export async function deleteList(formData: FormData) {
  const { supabase } = await signedIn();
  const listId = id(formData, "listId");
  if (!listId) return;
  await supabase.from("place_lists").delete().eq("id", listId);
  redirect("/lists");
}

export async function addToList(formData: FormData) {
  const { supabase } = await signedIn();
  const listId = id(formData, "listId");
  const placeId = id(formData, "placeId");
  if (!listId || !placeId) return;
  // Adding twice is a no-op (duplicate key).
  await supabase.from("place_list_items").insert({ list_id: listId, place_id: placeId });
  revalidatePath("/", "layout");
}

export async function removeFromList(formData: FormData) {
  const { supabase } = await signedIn();
  const listId = id(formData, "listId");
  const placeId = id(formData, "placeId");
  if (!listId || !placeId) return;
  await supabase.from("place_list_items").delete().eq("list_id", listId).eq("place_id", placeId);
  revalidatePath("/", "layout");
}
