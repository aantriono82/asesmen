import { AuthForm } from "@components/AuthForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-field px-6 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
