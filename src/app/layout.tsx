import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { getDesign } from "@/lib/design";
import { BottomNav } from "@/components/BottomNav";
import { HeaderNav } from "@/components/HeaderNav";
import { DesignSwitcher } from "@/components/DesignSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
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
  const design = await getDesign();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-stone-900">
        <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
          <HeaderNav signedIn={Boolean(user)} />
        </header>
        <main className={`flex-1 ${user ? "pb-24" : ""}`}>{children}</main>
        {user && <BottomNav />}
        <DesignSwitcher current={design} />
      </body>
    </html>
  );
}
