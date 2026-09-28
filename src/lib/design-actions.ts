"use server";

import { cookies } from "next/headers";
import { DESIGN_COOKIE, type Design } from "@/lib/design-constants";

export async function setDesignCookie(design: Design) {
  const store = await cookies();
  store.set(DESIGN_COOKIE, design, { path: "/", maxAge: 60 * 60 * 24 * 90 });
}
