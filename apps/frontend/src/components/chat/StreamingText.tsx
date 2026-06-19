"use client";

interface StreamingTextProps {
  text: string;
}

export function StreamingText({ text }: StreamingTextProps) {
  return <span className="whitespace-pre-wrap break-words">{text}</span>;
}
