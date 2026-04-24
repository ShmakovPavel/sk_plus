import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SK Plus",
  description: "Семейная платформа целей, оплат и викторин",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 text-zinc-900">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4">
          <header className="mb-4 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/" className="text-xl font-semibold">
                SK Plus
              </Link>
              {user ? (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <nav className="flex flex-wrap gap-3">
                    <Link href="/">Главная</Link>
                    <Link href="/goals">Цели</Link>
                    <Link href="/payments">Оплаты</Link>
                    <Link href="/quiz">Викторина</Link>
                    {user.isAdmin ? <Link href="/admin">Админка</Link> : null}
                  </nav>
                  <span className="text-zinc-500">
                    {user.firstName} {user.lastName}
                  </span>
                  <LogoutButton />
                </div>
              ) : (
                <Link href="/login" className="text-sm underline">
                  Вход / Регистрация
                </Link>
              )}
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
