import { StreamingText } from "./StreamingText";
import { ToolCallCard } from "./ToolCallCard";
import { ToolResultCard } from "./ToolResultCard";

interface MessageBubbleProps {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string | null;
  toolName?: string | null;
  toolInput?: Record<string, unknown> | null;
  toolOutput?: Record<string, unknown> | null;
  isStreaming?: boolean;
}

export function MessageBubble({
  role,
  content,
  toolCallId,
  toolName,
  toolInput,
  toolOutput,
  isStreaming = false
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-md px-4 py-3 text-sm shadow-sm ${
          isUser
            ? "bg-brand text-white"
            : "border border-line bg-white text-ink dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        }`}
      >
        {role === "tool" && toolName && toolInput ? <ToolCallCard name={toolName} input={toolInput} /> : null}
        {role === "tool" && toolOutput ? <div className="mt-3"><ToolResultCard output={toolOutput} /></div> : null}
        {role === "tool" && toolCallId ? <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{toolCallId}</p> : null}
        {content ? (
          <div className={role === "tool" ? "mt-3" : ""}>
            {isStreaming ? <StreamingText text={content} /> : <span className="whitespace-pre-wrap break-words">{content}</span>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
