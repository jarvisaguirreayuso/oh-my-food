"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email("Introduce un email válido");
const passwordLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Introduce tu contraseña"),
});
const passwordSignupSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirm"],
  });

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

// Prefer the host the request came in on so preview deployments (one URL per
// branch) send the link back to themselves; Supabase still enforces its own
// redirect allowlist, so a spoofed host can't redirect anywhere unlisted.
async function siteUrl() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return (host ? `${proto}://${host}` : undefined) ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Email inválido" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "sent", message: `Te hemos enviado un enlace a ${parsed.data}.` };
}

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

export async function signUpWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = passwordSignupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  // Supabase's enumeration-safe behavior: signing up an email that already has a
  // confirmed account succeeds with no error but an empty `identities` array,
  // instead of revealing the account exists. Show the exact same message either
  // way so the response can't be used to check whether an email is registered.
  if (data.session) redirect("/");
  return {
    status: "sent",
    message: `Revisa ${parsed.data.email} para confirmar tu cuenta y poder entrar.`,
  };
}
