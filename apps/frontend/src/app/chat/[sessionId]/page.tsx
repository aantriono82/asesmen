import { ChatSessionClient } from "@components/chat/ChatSessionClient";

export default function ChatSessionPage({ params }: { params: { sessionId: string } }) {
  return <ChatSessionClient sessionId={params.sessionId} />;
}
