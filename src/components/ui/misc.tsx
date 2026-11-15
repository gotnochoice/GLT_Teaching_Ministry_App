import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./card";
import { Badge } from "./badge";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const TONES = {
  brand: "bg-brand/10 text-brand",
  blue: "bg-blue-100 text-blue-600",
  amber: "bg-orange-100 text-orange-500",
  red: "bg-red-100 text-red-600",
} as const;

export function StatCard({ label, value, sub, accent, icon: Icon, tone = "brand" }: { label: string; value: React.ReactNode; sub?: string; accent?: boolean; icon?: LucideIcon; tone?: keyof typeof TONES }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3.5 sm:gap-4 sm:p-5">
        {Icon && (
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14", TONES[tone])}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs text-gray-500 sm:text-sm">{label}</p>
          <p className={cn("font-bold", typeof value === "string" && value.length > 7 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl", accent && !Icon ? "text-brand" : "text-gray-900")}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProgressBar({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, max ? (value / max) * 100 : 0));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-gray-100", className)}>
      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { v: "success" | "warning" | "destructive" | "outline" | "default" | "orange"; label: string }> = {
    graded: { v: "success", label: "Graded" },
    submitted: { v: "warning", label: "Awaiting grade" },
    not_started: { v: "outline", label: "Not started" },
    verified: { v: "success", label: "Verified" },
    pending: { v: "warning", label: "Pending" },
    rejected: { v: "destructive", label: "Rejected" },
    active: { v: "success", label: "Active" },
    paused: { v: "warning", label: "Paused" },
    withdrawn: { v: "destructive", label: "Withdrawn" },
    graduated: { v: "orange", label: "Graduated" },
  };
  const m = map[status] ?? { v: "outline" as const, label: status };
  return <Badge variant={m.v}>{m.label}</Badge>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">{children}</p>;
}
