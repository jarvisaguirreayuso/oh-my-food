"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Pages reachable directly from the bottom nav (or the signed-out header) are
// "home base" screens: no back arrow, just the logo. Everything else was
// navigated into from somewhere, so it gets a back arrow instead.
const TOP_LEVEL = new Set(["/", "/map", "/visits/new", "/lists", "/me", "/explore"]);

export function HeaderNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const isTopLevel = TOP_LEVEL.has(pathname) || pathname.startsWith("/auth");

  function handleBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
      {isTopLevel ? (
        <Link href="/" className="text-lg font-bold">
          🍽️ oh my food
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleBack}
          aria-label="Volver"
          className="-ml-2 flex items-center gap-1 rounded-lg py-1 pl-1 pr-3 text-lg font-medium text-stone-700"
        >
          <span aria-hidden>←</span>
          <span className="text-sm font-normal text-stone-500">Volver</span>
        </button>
      )}
      {!signedIn && isTopLevel && (
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/explore" className="text-stone-600">
            Buscar
          </Link>
          <Link href="/auth/login" className="font-medium">
            Entrar
          </Link>
        </nav>
      )}
    </div>
  );
}
