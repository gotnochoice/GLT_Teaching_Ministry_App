import { gradeResult } from "@/lib/actions/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GradeForm({ assessmentId, studentId, max, defaultScore, defaultFeedback }: { assessmentId: string; studentId: string; max: number; defaultScore?: number | null; defaultFeedback?: string | null }) {
  return (
    <form action={gradeResult} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <input type="hidden" name="studentId" value={studentId} />
      <div><label className="text-xs text-gray-500">Score /{max}</label><Input name="score" type="number" min={0} max={max} required defaultValue={defaultScore ?? ""} className="h-9 w-24" /></div>
      <div className="min-w-48 flex-1"><label className="text-xs text-gray-500">Feedback</label><Input name="feedback" defaultValue={defaultFeedback ?? ""} className="h-9" /></div>
      <Button size="sm" type="submit">Save grade</Button>
    </form>
  );
}
