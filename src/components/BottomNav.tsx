"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/map", label: "Mapa", icon: "🗺️" },
  { href: "/visits/new", label: "Registrar", icon: "＋", primary: true },
  { href: "/lists", label: "Listas", icon: "🔖" },
  { href: "/me", label: "Perfil", icon: "🙂" },
];

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-2xl items-end justify-around px-2 py-1.5">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`flex min-w-14 flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] ${
                isActive(item.href) ? "font-semibold text-stone-900" : "text-stone-500"
              }`}
            >
              {item.primary ? (
                <span className="-mt-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-2xl leading-none text-white shadow">
                  {item.icon}
                </span>
              ) : (
                <span className="text-lg leading-none">{item.icon}</span>
              )}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
