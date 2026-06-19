import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-field dark:bg-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand dark:text-teal-400">ATIGA Assessment AI</p>
          <h1 className="text-4xl font-semibold leading-tight text-ink dark:text-slate-100 md:text-6xl">
            Bangun asesmen pembelajaran dengan bantuan AI yang terstruktur.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700 dark:text-slate-300">
            Platform untuk guru dan admin sekolah dalam membuat soal, mengelola dokumen pembelajaran, dan menjalankan skill AI
            asesmen berbasis PostgreSQL.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex h-11 items-center rounded-md border border-line bg-white px-5 text-sm font-semibold text-ink hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Daftar Guru
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
