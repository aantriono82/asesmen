import { Wrench } from "lucide-react";

interface ToolCallCardProps {
  name: string;
  input: Record<string, unknown>;
}

export function ToolCallCard({ name, input }: ToolCallCardProps) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
        <Wrench className="h-4 w-4" />
        <span>{name}</span>
      </div>
      <pre className="mt-2 overflow-x-auto text-xs text-amber-900 dark:text-amber-100">{JSON.stringify(input, null, 2)}</pre>
    </div>
  );
}
