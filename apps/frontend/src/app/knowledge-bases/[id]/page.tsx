import { KnowledgeBaseDetailClient } from "@components/knowledge/KnowledgeBaseDetailClient";

export default function KnowledgeBaseDetailPage({ params }: { params: { id: string } }) {
  return <KnowledgeBaseDetailClient id={params.id} />;
}
