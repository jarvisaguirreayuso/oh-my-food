import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that need a session. Places, dishes and their general averages are
// public (docs/plan-fase-2-social.md, B.9 #3 a); anything personal or social
// (visits, profiles, people, writing) needs an account.
const PROTECTED_PREFIXES = ["/visits", "/places/new", "/me", "/u", "/people"];

function requiresSession(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session if needed. Do not add logic between createServerClient
  // and this call, and do not remove it: it keeps the auth cookies in sync.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && requiresSession(request.nextUrl.pathname)) {
    const redirect = NextResponse.redirect(new URL("/auth/login", request.url));
    // Carry over any cookies the refresh above tried to set (e.g. clearing a stale session).
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
