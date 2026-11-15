import { requireRole } from "@/lib/session";
import { getRules } from "@/lib/progress";
import { saveSettings } from "@/lib/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/misc";

export default async function AdminSettings() {
  await requireRole("ADMIN");
  const r = await getRules();
  const fields: [string, string, number, string][] = [
    ["pass_mark", "Pass mark (%)", r.passMark, "Minimum score for a test, assignment, exam or internship to count as passed."],
    ["prayers_required", "Prayers required", r.prayersRequired, "Verified entries needed (ungraded)."],
    ["evangelism_required", "Evangelism required", r.evangelismRequired, "Verified entries needed (ungraded)."],
    ["weight_classwork", "Weight: tests & assignments (%)", r.weightClasswork, "Share of the overall grade."],
    ["weight_exam", "Weight: final exam (%)", r.weightExam, ""],
    ["weight_internship", "Weight: internship (%)", r.weightInternship, ""],
  ];
  return (
    <>
      <PageHeader title="Settings" description="Graduation rules and grade weights." />
      <Card className="max-w-xl"><CardContent className="p-6">
        <form action={saveSettings} className="space-y-4">
          {fields.map(([k, label, v, hint]) => (
            <div key={k} className="space-y-1.5"><Label htmlFor={k}>{label}</Label><Input id={k} name={k} type="number" min={0} defaultValue={v} required />{hint && <p className="text-xs text-gray-500">{hint}</p>}</div>
          ))}
          <Button type="submit">Save settings</Button>
        </form>
      </CardContent></Card>
    </>
  );
}
