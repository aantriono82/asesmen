import { SkeletonCard } from "@components/ui/SkeletonCard";

export default function LoadingPage() {
  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </section>
    </main>
  );
}
