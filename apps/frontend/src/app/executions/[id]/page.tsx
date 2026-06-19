import { ExecutionStatusClient } from "@components/executions/ExecutionStatusClient";

export default function ExecutionStatusPage({ params }: { params: { id: string } }) {
  return <ExecutionStatusClient id={params.id} />;
}

export function generateStaticParams(): Array<{ id: string }> {
  return [];
}
