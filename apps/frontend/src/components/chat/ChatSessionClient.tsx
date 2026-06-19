"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Cpu, User2 } from "lucide-react";
import { env } from "@lib/env";
import { getAccessToken, getStoredUser, isTeacher } from "@lib/auth";
import { apiFetch } from "@lib/api";
import { toast } from "@lib/toast";
import type { ChatMessage, ChatSessionDetail, ChatStreamEvent, TokenUsageSummary } from "@lib/types";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

interface ChatSessionClientProps {
  sessionId: string;
}

export function ChatSessionClient({ sessionId }: ChatSessionClientProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [title, setTitle] = useState("Chat");
  const [ragActive, setRagActive] = useState(false);
  const [retrievalInfo, setRetrievalInfo] = useState<number | null>(null);
  const [tokenSummary, setTokenSummary] = useState<TokenUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!isTeacher(user)) {
      router.replace("/login");
      return;
    }

    void Promise.all([loadSession(), loadUsage()]);
  }, [router, sessionId]);

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function loadSession(): Promise<void> {
    setLoading(true);
    try {
      const response = await apiFetch<ChatSessionDetail>(`/chat/sessions/${sessionId}`);
      const detail = response.data;
      setTitle(detail?.session.title ?? "Chat");
      setRagActive(Boolean(detail?.session.knowledgeBaseId));
      setMessages(detail?.messages ?? []);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat session");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsage(): Promise<void> {
    try {
      const response = await apiFetch<TokenUsageSummary>("/usage/summary");
      setTokenSummary(response.data ?? null);
    } catch {
      setTokenSummary(null);
    }
  }

  async function handleSend(content: string): Promise<void> {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sessionId,
      role: "user",
      content,
      toolCallId: null,
      toolName: null,
      toolInput: null,
      toolOutput: null,
      tokensIn: null,
      tokensOut: null,
      createdAt: new Date().toISOString()
    };

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      sessionId,
      role: "assistant",
      content: "",
      toolCallId: null,
      toolName: null,
      toolInput: null,
      toolOutput: null,
      tokensIn: null,
      tokensOut: null,
      createdAt: new Date().toISOString()
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setStreaming(true);

    try {
      const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok || !response.body) {
        throw new Error("Gagal membuka stream chat");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith("data: ")) {
            continue;
          }

          const payload = JSON.parse(line.slice(6)) as ChatStreamEvent;
          applyStreamEvent(payload);
        }
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal mengirim pesan");
    } finally {
      setStreaming(false);
      await Promise.all([loadSession(), loadUsage()]);
    }
  }

  function applyStreamEvent(event: ChatStreamEvent): void {
    if (event.type === "text") {
      setMessages((current) => {
        const next = [...current];
        const last = next[next.length - 1];
        if (!last || last.role !== "assistant") {
          return current;
        }

        next[next.length - 1] = {
          ...last,
          content: `${last.content}${event.delta}`
        };
        return next;
      });
      return;
    }

    if (event.type === "retrieval") {
      setRetrievalInfo(event.chunks_found);
      return;
    }

    if (event.type === "tool_use") {
      setMessages((current) => [
        ...current,
        {
          id: `tool-${Date.now()}`,
          sessionId,
          role: "tool",
          content: "",
          toolCallId: null,
          toolName: event.name,
          toolInput: event.input,
          toolOutput: null,
          tokensIn: null,
          tokensOut: null,
          createdAt: new Date().toISOString()
        }
      ]);
      return;
    }

    if (event.type === "tool_result") {
      setMessages((current) => {
        const next = [...current];
        for (let index = next.length - 1; index >= 0; index -= 1) {
          const item = next[index];
          if (item?.role === "tool" && !item.toolOutput) {
            next[index] = {
              ...item,
              toolOutput: event.output
            };
            break;
          }
        }
        return next;
      });
      return;
    }

    if (event.type === "done") {
      setTokenSummary((current) =>
        current
          ? {
              ...current,
              tokensIn: current.tokensIn + event.tokens.in,
              tokensOut: current.tokensOut + event.tokens.out
            }
          : current
      );
      return;
    }

    if (event.type === "error") {
      toast.error(event.message);
    }
  }

  const totalTokens = useMemo(() => {
    if (!tokenSummary) {
      return 0;
    }

    return tokenSummary.tokensIn + tokenSummary.tokensOut;
  }, [tokenSummary]);

  return (
    <main className="min-h-screen bg-field px-6 py-8 dark:bg-slate-950">
      <section className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-md border border-line bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm font-semibold text-brand dark:text-teal-400">Session</div>
          <h1 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">{title}</h1>
          <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {ragActive ? <div className="font-semibold text-sky-600 dark:text-sky-300">RAG Aktif</div> : null}
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              <span>{totalTokens.toLocaleString("id-ID")} token bulan ini</span>
            </div>
            {retrievalInfo !== null ? <div>{retrievalInfo} chunk referensi ditemukan</div> : null}
            {streaming ? <div className="text-brand dark:text-teal-400">Model sedang merespons...</div> : null}
          </div>
        </aside>

        <div className="overflow-hidden rounded-md border border-line bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div ref={viewportRef} className="flex h-[70vh] flex-col gap-4 overflow-y-auto p-4">
            {loading ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">Memuat percakapan...</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">Belum ada pesan.</div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {message.role === "user" ? <User2 className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    <span>{message.role}</span>
                  </div>
                  <MessageBubble
                    role={message.role === "system" ? "assistant" : message.role}
                    content={message.content}
                    toolCallId={message.toolCallId}
                    toolName={message.toolName}
                    toolInput={message.toolInput}
                    toolOutput={message.toolOutput}
                    isStreaming={streaming && message === messages[messages.length - 1] && message.role === "assistant"}
                  />
                </div>
              ))
            )}
          </div>

          <ChatInput disabled={streaming} onSubmit={handleSend} />
        </div>
      </section>
    </main>
  );
}
