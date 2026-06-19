"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuth, getRefreshToken, getStoredUser } from "@lib/auth";
import { apiFetch } from "@lib/api";
import { toast } from "@lib/toast";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  async function handleLogout(): Promise<void> {
    const refreshToken = getRefreshToken();

    try {
      if (refreshToken) {
        await apiFetch("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken })
        });
      }
      toast.success("Logout berhasil");
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "Logout gagal");
    } finally {
      clearAuth();
      router.replace("/login");
    }
  }

  const linkClass = (href: string) =>
    `text-sm font-medium ${
      pathname === href ? "text-brand dark:text-teal-400" : "text-slate-600 dark:text-slate-300"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold text-brand dark:text-teal-400">
            ATIGA Assessment AI
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            <Link href="/" prefetch={false} className={linkClass("/")}>
              Home
            </Link>
            <Link href="/skills" prefetch={false} className={linkClass("/skills")}>
              Skills
            </Link>
            <Link href="/executions" prefetch={false} className={linkClass("/executions")}>
              Executions
            </Link>
            <Link href="/workflows" prefetch={false} className={linkClass("/workflows")}>
              Workflows
            </Link>
            <Link href="/assessments" prefetch={false} className={linkClass("/assessments")}>
              Assessments
            </Link>
            <Link href="/question-bank" prefetch={false} className={linkClass("/question-bank")}>
              Bank Soal
            </Link>
            <Link href="/curricula" prefetch={false} className={linkClass("/curricula")}>
              Kurikulum
            </Link>
            <Link href="/documents" prefetch={false} className={linkClass("/documents")}>
              Dokumen
            </Link>
            <Link href="/knowledge-bases" prefetch={false} className={linkClass("/knowledge-bases")}>
              Knowledge Base
            </Link>
            <Link href="/chat" prefetch={false} className={linkClass("/chat")}>
              Chat
            </Link>
            <Link href="/dashboard" prefetch={false} className={linkClass("/dashboard")}>
              Dashboard
            </Link>
            <Link href="/admin" prefetch={false} className={linkClass("/admin")}>
              Admin
            </Link>
            <Link href="/notifications" prefetch={false} className={linkClass("/notifications")}>
              Notifikasi
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? <NotificationBell /> : null}
          <ThemeToggle />
          {user ? (
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex h-10 items-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              Logout
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                prefetch={false}
                className="inline-flex h-10 items-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                Login
              </Link>
              <Link href="/register" prefetch={false} className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white">
                Daftar
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
