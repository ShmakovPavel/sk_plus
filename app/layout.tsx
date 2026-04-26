import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const saved = localStorage.getItem("theme");
                const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                document.documentElement.dataset.theme = saved ?? (prefersDark ? "dark" : "light");
              } catch {
                document.documentElement.dataset.theme = "light";
              }
            })();`,
          }}
        />
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4">
          <header className="mb-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Link href={user?.isAdmin ? "/admin" : "/"} className="text-xl font-semibold text-[var(--accent)]">
                  SK Plus
                </Link>
                {user ? (
                  <span className="text-sm text-[var(--muted)]">
                    {user.firstName} {user.lastName}
                  </span>
                ) : null}
              </div>
              {user ? (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <nav className="flex flex-wrap gap-3 text-[var(--foreground)]">
                    {user.isAdmin ? (
                      <Link href="/admin" className="transition-colors hover:text-[var(--accent)]">
                        Админка
                      </Link>
                    ) : (
                      <>
                        <Link href="/goals" className="transition-colors hover:text-[var(--accent)]">
                          Цели
                        </Link>
                        <Link href="/payments" className="transition-colors hover:text-[var(--accent)]">
                          Оплаты
                        </Link>
                        <Link href="/quiz" className="transition-colors hover:text-[var(--accent)]">
                          Викторина
                        </Link>
                      </>
                    )}
                  </nav>
                  <LogoutButton />
                </div>
              ) : null}
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-4 flex justify-center">
            <ThemeToggle />
          </footer>
        </div>
      </body>
    </html>
  );
}
