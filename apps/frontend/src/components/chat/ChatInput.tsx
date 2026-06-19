"use client";

import { SendHorizonal } from "lucide-react";
import { useState } from "react";

interface ChatInputProps {
  disabled?: boolean;
  onSubmit: (content: string) => Promise<void>;
}

export function ChatInput({ disabled = false, onSubmit }: ChatInputProps) {
  const [value, setValue] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const content = value.trim();
    if (!content || disabled) {
      return;
    }

    setValue("");
    await onSubmit(content);
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="border-t border-line bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-end gap-3">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled}
          rows={3}
          placeholder="Tulis instruksi atau pertanyaan..."
          className="min-h-[88px] flex-1 resize-none rounded-md border border-line bg-field px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="submit"
          disabled={disabled || value.trim().length === 0}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand text-white disabled:cursor-not-allowed disabled:opacity-60"
          title="Kirim"
        >
          <SendHorizonal className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
