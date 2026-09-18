import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "oh my food",
  description: "Valora sitios de comida y sus platos, y sigue su evolución en el tiempo",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-neutral-900">
        <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold">
              🍽️ oh my food
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              {user ? (
                <>
                  <Link href="/visits/new" className="font-medium">
                    Registrar visita
                  </Link>
                  <Link href="/visits/mine" className="text-neutral-600">
                    Mis visitas
                  </Link>
                  <form action={signOut}>
                    <button className="text-neutral-400">Salir</button>
                  </form>
                </>
              ) : (
                <Link href="/auth/login" className="font-medium">
                  Entrar
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
