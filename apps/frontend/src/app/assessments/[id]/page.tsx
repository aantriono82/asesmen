import { AssessmentDetailClient } from "@components/assessments/AssessmentDetailClient";

export default function AssessmentDetailPage({ params }: { params: { id: string } }) {
  return <AssessmentDetailClient assessmentId={params.id} />;
}
