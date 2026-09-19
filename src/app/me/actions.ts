"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { profileSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { status: "idle" | "error"; message?: string };

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const parsed = profileSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName") || null,
    bio: formData.get("bio") || null,
    defaultAudience: formData.get("defaultAudience"),
    defaultPoolsPublicly: formData.get("defaultPoolsPublicly") === "on",
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const p = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({ username: p.username, display_name: p.displayName, bio: p.bio })
    .eq("id", user.id);
  if (error) {
    return {
      status: "error",
      message: error.code === "23505" ? "Ese nombre de usuario ya está cogido" : error.message,
    };
  }

  const { error: settingsError } = await supabase.from("profile_settings").upsert({
    user_id: user.id,
    default_audience: p.defaultAudience,
    default_pools_publicly: p.defaultPoolsPublicly,
  });
  if (settingsError) return { status: "error", message: settingsError.message };

  revalidatePath("/", "layout");
  redirect("/me");
}
