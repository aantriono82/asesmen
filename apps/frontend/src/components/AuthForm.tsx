"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { apiFetch } from "@lib/api";
import { saveAuth } from "@lib/auth";
import { toast } from "@lib/toast";
import type { AuthResult } from "@lib/types";
import { loginSchema, registerSchema, type LoginFormValues, type RegisterFormValues } from "@lib/validations/auth.schema";

interface AuthFormProps {
  mode: "login" | "register";
}

type AuthFormValues = LoginFormValues | RegisterFormValues;

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const schema = mode === "register" ? registerSchema : loginSchema;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: mode === "register" ? { name: "", email: "", password: "" } : { email: "", password: "" }
  });

  async function onSubmit(values: AuthFormValues): Promise<void> {
    const loaderId = toast.loading(mode === "register" ? "Mendaftarkan akun..." : "Memproses login...");

    try {
      const response = await apiFetch<AuthResult>(mode === "register" ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(values)
      });

      if (!response.data) {
        throw new Error("Respons autentikasi tidak valid");
      }

      saveAuth(response.data.tokens.accessToken, response.data.tokens.refreshToken, response.data.user);
      toast.dismiss(loaderId);
      toast.success(mode === "register" ? "Registrasi berhasil" : "Login berhasil");
      router.push("/dashboard");
    } catch (caught: unknown) {
      toast.dismiss(loaderId);
      toast.error(caught instanceof Error ? caught.message : "Terjadi kesalahan");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h1 className="text-2xl font-semibold text-ink dark:text-slate-100">
        {mode === "register" ? "Daftar Guru" : "Login"}
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {mode === "register" ? "Akun baru otomatis memiliki role teacher." : "Masuk untuk membuka dashboard skill."}
      </p>

      {mode === "register" ? (
        <label className="mt-6 block text-sm font-medium text-ink dark:text-slate-100">
          Nama
          <input
            {...register("name" as const)}
            className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          {"name" in errors && errors.name ? (
            <span className="mt-2 block text-xs text-red-600 dark:text-red-400">{errors.name.message}</span>
          ) : null}
        </label>
      ) : null}

      <label className="mt-4 block text-sm font-medium text-ink dark:text-slate-100">
        Email
        <input
          type="email"
          {...register("email")}
          className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        {errors.email ? <span className="mt-2 block text-xs text-red-600 dark:text-red-400">{errors.email.message}</span> : null}
      </label>

      <label className="mt-4 block text-sm font-medium text-ink dark:text-slate-100">
        Password
        <input
          type="password"
          {...register("password")}
          className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        {errors.password ? (
          <span className="mt-2 block text-xs text-red-600 dark:text-red-400">{errors.password.message}</span>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Memproses..." : mode === "register" ? "Daftar" : "Login"}
      </button>

      <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
        {mode === "register" ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
        <Link href={mode === "register" ? "/login" : "/register"} className="font-semibold text-brand dark:text-teal-400">
          {mode === "register" ? "Login" : "Daftar"}
        </Link>
      </p>
    </form>
  );
}
