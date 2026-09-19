"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function currentUserAndTarget(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const target = z.guid().safeParse(formData.get("userId"));
  // Silently ignore malformed ids and self-follows (the database rejects them too).
  if (!target.success || target.data === user.id) return null;
  return { supabase, me: user.id, target: target.data };
}

export async function followUser(formData: FormData) {
  const ctx = await currentUserAndTarget(formData);
  if (!ctx) return;
  // A duplicate follow (23505) just means it already exists.
  await ctx.supabase.from("follows").insert({ follower_id: ctx.me, followee_id: ctx.target });
  revalidatePath("/", "layout");
}

export async function unfollowUser(formData: FormData) {
  const ctx = await currentUserAndTarget(formData);
  if (!ctx) return;
  await ctx.supabase.from("follows").delete().eq("follower_id", ctx.me).eq("followee_id", ctx.target);
  revalidatePath("/", "layout");
}
