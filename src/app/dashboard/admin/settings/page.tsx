import { requireRole } from "@/lib/session";
import { getRules } from "@/lib/progress";
import { saveSettings } from "@/lib/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/misc";
import { providerStatus } from "@/lib/notify";

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
    ["min_attendance_pct", "Minimum attendance (%)", r.minAttendancePct, "Required to graduate. Excused sessions don't count against a student. 0 turns this off."],
    ["internship_hours_required", "Internship hours required", r.internshipHoursRequired, "Verified hours needed before graduation. 0 turns this off."],
  ];
  return (
    <>
      <PageHeader title="Settings" description="Graduation rules and grade weights." />
      <div className="mb-6 max-w-xl rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <p className="mb-2 font-semibold">Reminder channels</p>
        <p>Email: {providerStatus().email ? <span className="text-green-700">connected</span> : <span className="text-gray-500">not set up (add RESEND_API_KEY and EMAIL_FROM)</span>}</p>
        <p>WhatsApp: {providerStatus().whatsapp ? <span className="text-green-700">connected</span> : <span className="text-gray-500">not set up (add the TWILIO_* variables)</span>}</p>
      </div>
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
