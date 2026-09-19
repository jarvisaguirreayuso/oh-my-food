"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email("Introduce un email válido");
const passwordLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Introduce tu contraseña"),
});

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Email inválido" };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "sent", message: `Te hemos enviado un enlace a ${parsed.data}.` };
}

// Sign-in only: there is deliberately no password sign-up, accounts are created
// through the magic link (or by hand for test accounts).
export async function signInWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = passwordLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Same message for a wrong password and an unknown email, so it can't be used to probe accounts.
    return { status: "error", message: "Email o contraseña incorrectos" };
  }

  redirect("/");
}
