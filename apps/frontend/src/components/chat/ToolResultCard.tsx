import { CheckCircle2 } from "lucide-react";

interface ToolResultCardProps {
  output: Record<string, unknown>;
}

export function ToolResultCard({ output }: ToolResultCardProps) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4" />
        <span>Hasil Tool</span>
      </div>
      <pre className="mt-2 overflow-x-auto text-xs text-emerald-900 dark:text-emerald-100">{JSON.stringify(output, null, 2)}</pre>
    </div>
  );
}
