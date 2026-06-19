"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@lib/api";
import type { User } from "@lib/types";
import { toast } from "@lib/toast";

export function AdminUsersClient() {
  const [users, setUsers] = useState<User[]>([]);

  async function load(): Promise<void> {
    const response = await apiFetch<User[]>("/admin/users");
    setUsers(response.data ?? []);
  }

  useEffect(() => {
    void load().catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Gagal memuat user"));
  }, []);

  async function updateUser(userId: string, body: Record<string, unknown>): Promise<void> {
    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      toast.success("User diperbarui");
      await load();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui user");
    }
  }

  return (
    <main className="min-h-screen bg-field px-6 py-10 dark:bg-slate-950">
      <section className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold text-ink dark:text-slate-100">Admin Users</h1>
        <div className="mt-6 grid gap-3">
          {users.map((user) => (
            <div key={user.id} className="grid gap-3 rounded-md border border-line bg-white p-4 md:grid-cols-[1.5fr_140px_120px_220px] md:items-center dark:border-slate-800 dark:bg-slate-900">
              <div>
                <p className="font-medium text-ink dark:text-slate-100">{user.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
              <select value={user.role} onChange={(event) => void updateUser(user.id, { role: event.target.value })} className="input-base">
                <option value="teacher">teacher</option>
                <option value="admin">admin</option>
              </select>
              <button type="button" onClick={() => void updateUser(user.id, { isActive: !user.isActive })} className="btn-secondary">
                {user.isActive ? "Deactivate" : "Activate"}
              </button>
              <button type="button" onClick={() => {
                const next = window.prompt("Password baru minimal 8 karakter");
                if (next) {
                  void updateUser(user.id, { password: next });
                }
              }} className="btn-primary">
                Reset Password
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
