"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@lib/api";
import { getAccessToken } from "@lib/auth";
import type { NotificationItem } from "@lib/types";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const token = getAccessToken();

    if (!open || !token) {
      return () => {
        cancelled = true;
      };
    }

    async function loadNotifications(): Promise<void> {
      try {
        const [unreadResponse, latestResponse] = await Promise.all([
          apiFetch<{ unreadCount: number }>("/notifications/unread-count"),
          apiFetch<NotificationItem[]>("/notifications/latest")
        ]);
        if (!cancelled) {
          setUnreadCount(unreadResponse.data?.unreadCount ?? 0);
          setItems(latestResponse.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0);
          setItems([]);
        }
      }
    }

    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white text-ink dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        aria-label="Notifikasi"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-40 w-80 rounded-lg border border-line bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink dark:text-slate-100">Notifikasi</p>
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-sm font-medium text-brand dark:text-teal-400">
              Lihat semua
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">Belum ada notifikasi.</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className="rounded-md border border-line p-3 dark:border-slate-800">
                  <p className="text-sm font-semibold text-ink dark:text-slate-100">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{item.message ?? "Tanpa detail tambahan"}</p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
