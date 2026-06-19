import { SkillDetailClient } from "@components/skills/SkillDetailClient";

export default function SkillDetailPage({ params }: { params: { slug: string } }) {
  return <SkillDetailClient slug={params.slug} />;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return [];
}
