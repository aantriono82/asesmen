import { CurriculumDetailClient } from "@components/curricula/CurriculumDetailClient";

export default function CurriculumDetailPage({ params }: { params: { id: string } }) {
  return <CurriculumDetailClient id={params.id} />;
}
